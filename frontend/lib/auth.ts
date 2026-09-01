// ─── Auth utilities for PROJECT NOVA ─────────────────────────
// Real JWT-based auth via Spring Boot backend
// Replaces localStorage mock auth

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const TOKEN_KEY = 'nova_token';
const USER_KEY  = 'nova_user';

// ─── AuthUser ────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'officer' | 'rescue_team' | 'hospital' | 'admin';
  avatarUrl?: string;
  phone?: string;
  district?: string;
  organization?: string;
  createdAt: string;
  lastActive: string;
  isActive: boolean;
  isVerified: boolean;
  language: 'en' | 'ta' | 'si';
}

// ─── Validation (kept as-is for frontend forms) ────────────────

export interface FieldError {
  field: string;
  message: string;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return 'Email is required';
  const trimmed = email.trim();
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(trimmed)) return 'Enter a valid email address (e.g. you@example.com)';
  const blockedDomains = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com', 'trashmail.com'];
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (blockedDomains.includes(domain)) return 'Disposable email addresses are not allowed';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

export function validateName(name: string): string | null {
  if (!name || !name.trim()) return 'Full name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 60) return 'Name must be at most 60 characters';
  if (!/^[a-zA-Z\s\u0080-\uFFFF]+$/.test(name.trim())) return 'Name can only contain letters and spaces';
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) return null;
  const cleaned = phone.replace(/[\s\-()\\+]/g, '');
  if (!/^[0-9]{7,15}$/.test(cleaned)) return 'Enter a valid phone number (7–15 digits)';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

  return { score: clamped, label: labels[clamped], color: colors[clamped] };
}

// ─── Token helpers ────────────────────────────────────────────

export function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) || '';
}

function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function saveUser(user: AuthUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// ─── API helper ──────────────────────────────────────────────

async function authFetch(endpoint: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Auth Result ─────────────────────────────────────────────

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  role: AuthUser['role'];
  phone?: string;
  district?: string;
  organization?: string;
  language?: string;
}

export type AuthResult =
  | { success: true; user: AuthUser; requiresVerification?: boolean; demoOtp?: string }
  | { success: false; error: string; field?: string };

// ─── Sign Up ─────────────────────────────────────────────────

export async function signUp(payload: SignUpPayload): Promise<AuthResult> {
  // Frontend validation
  const nameErr = validateName(payload.name);
  if (nameErr) return { success: false, error: nameErr, field: 'name' };

  const emailErr = validateEmail(payload.email);
  if (emailErr) return { success: false, error: emailErr, field: 'email' };

  const passErr = validatePassword(payload.password);
  if (passErr) return { success: false, error: passErr, field: 'password' };

  try {
    const body: Record<string, unknown> = { ...payload };
    const res = await authFetch('/auth/register', body);
    const json = await res.json();

    if (!res.ok || !json.success) {
      return { success: false, error: json.message || 'Registration failed. Please try again.' };
    }

    const { accessToken, user } = json.data;
    saveToken(accessToken);
    saveUser(user);
    return { success: true, user };
  } catch {
    return { success: false, error: 'Cannot connect to server. Please ensure the backend is running.' };
  }
}

// ─── Sign In ─────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const emailErr = validateEmail(email);
  if (emailErr) return { success: false, error: emailErr, field: 'email' };

  const passErr = validatePassword(password);
  if (passErr) return { success: false, error: passErr, field: 'password' };

  try {
    const res = await authFetch('/auth/login', { email, password });
    const json = await res.json();

    if (!res.ok || !json.success) {
      const msg = json.message || 'Invalid email or password.';
      return { success: false, error: msg };
    }

    const { accessToken, user } = json.data;
    saveToken(accessToken);
    saveUser(user);
    return { success: true, user };
  } catch {
    return { success: false, error: 'Cannot connect to server. Please ensure the backend is running.' };
  }
}

// ─── Sign Out ────────────────────────────────────────────────

export function signOut(): void {
  clearSession();
}

// ─── Get Session ─────────────────────────────────────────────

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = getToken();
    if (!token) return null;

    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    const user: AuthUser = JSON.parse(userStr);
    return user;
  } catch {
    return null;
  }
}

// ─── Forgot Password ─────────────────────────────────────────

export async function forgotPassword(
  email: string
): Promise<{ success: boolean; message: string; demoToken?: string }> {
  const emailErr = validateEmail(email);
  if (emailErr) return { success: false, message: emailErr };

  // Backend endpoint (optional — can be added later)
  // For now return a generic message
  return {
    success: true,
    message: `If ${email} is registered, a reset link has been sent.`,
  };
}

// ─── Reset Password ──────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  const passErr = validatePassword(newPassword);
  if (passErr) return { success: false, error: passErr, field: 'password' };

  // Backend endpoint (optional — can be added later)
  return { success: false, error: 'Password reset via backend not yet configured.' };
}

// ─── Google OAuth (stub — integrate with NextAuth or Firebase later) ──

export async function signInWithGoogle(_simulatedEmail?: string): Promise<AuthResult> {
  return {
    success: false,
    error: 'Google OAuth requires NextAuth.js or Firebase Auth setup. Please use email/password.',
  };
}

// ─── Email Verification ───────────────────────────────────────

export async function verifyEmail(
  email: string,
  otp: string
): Promise<AuthResult> {
  try {
    const res = await authFetch('/auth/verify-otp', { email, otp });
    const json = await res.json();

    if (!res.ok || !json.success) {
      const msg = json.message || 'Invalid or expired verification code.';
      return { success: false, error: msg };
    }

    const { accessToken, user } = json.data;
    if (accessToken) saveToken(accessToken);
    if (user) saveUser(user);
    return { success: true, user };
  } catch {
    return { success: false, error: 'Cannot connect to server. Please ensure the backend is running.' };
  }
}

export async function resendVerificationCode(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const res = await fetch(`${apiBase}/auth/resend-otp?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    });
    const json = await res.json();
    return { success: res.ok, message: json.message || 'Verification code resent.' };
  } catch {
    return { success: false, message: 'Cannot connect to server.' };
  }
}

