// ─── Auth utilities for PROJECT NOVA ─────────────────────────
// Client-side mock auth with email verification simulation

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'officer' | 'rescue_team' | 'hospital' | 'admin';
  avatarUrl?: string;
  phone?: string;
  district?: string;
  createdAt: string;
  lastActive: string;
  isActive: boolean;
  isVerified: boolean;          // NEW: email verification flag
  language: 'en' | 'ta' | 'si';
}

// ─── Validation ────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return 'Email is required';
  const trimmed = email.trim();
  // Strict RFC-like pattern — rejects obvious fakes like "a@b"
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(trimmed)) return 'Enter a valid email address (e.g. you@example.com)';
  // Block common disposable / fake TLDs used in demos without the allowed list
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
  if (!phone || !phone.trim()) return null; // Optional
  const cleaned = phone.replace(/[\s\-()\+]/g, '');
  if (!/^[0-9]{7,15}$/.test(cleaned)) return 'Enter a valid phone number (7–15 digits)';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

export function getPasswordStrength(password: string): {
  score: number; // 0–4
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

// ─── Mock user DB (in-memory, persisted in localStorage) ──────

const STORAGE_KEY = 'nova_users_v2';
const SESSION_KEY = 'nova_session_v2';
// Track pending verifications: email → OTP code
const VERIFY_KEY   = 'nova_verify_pending';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Demo only — NOT cryptographic
  role: AuthUser['role'];
  phone?: string;
  district?: string;
  createdAt: string;
  language: 'en' | 'ta' | 'si';
  isVerified: boolean;
  provider: 'email' | 'google';
}

/** Simple deterministic hash — demo only, NOT cryptographic */
function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash) ^ password.charCodeAt(i);
    hash |= 0;
  }
  return `nova_${Math.abs(hash).toString(16)}`;
}

function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ─── Demo accounts (pre-seeded, pre-verified) ─────────────────

function seedDemoUsers() {
  if (typeof window === 'undefined') return;
  const existing = getStoredUsers();
  if (existing.length > 0) return;

  const demos: StoredUser[] = [
    { id: 'demo-citizen',  name: 'Amal Perera',          email: 'citizen@nova.lk',  passwordHash: hashPassword('Demo1234'), role: 'citizen',     createdAt: '2024-01-01T00:00:00Z', language: 'en', isVerified: true, provider: 'email' },
    { id: 'demo-officer',  name: 'Dilrukshi Silva',       email: 'officer@nova.lk',  passwordHash: hashPassword('Demo1234'), role: 'officer',     createdAt: '2024-01-01T00:00:00Z', language: 'en', isVerified: true, provider: 'email' },
    { id: 'demo-rescue',   name: 'Ravi Kumaran',          email: 'rescue@nova.lk',   passwordHash: hashPassword('Demo1234'), role: 'rescue_team', createdAt: '2024-01-01T00:00:00Z', language: 'ta', isVerified: true, provider: 'email' },
    { id: 'demo-hospital', name: 'Dr. Nilanthi Fernando', email: 'hospital@nova.lk', passwordHash: hashPassword('Demo1234'), role: 'hospital',    createdAt: '2024-01-01T00:00:00Z', language: 'en', isVerified: true, provider: 'email' },
    { id: 'demo-admin',    name: 'Nova Admin',            email: 'admin@nova.lk',    passwordHash: hashPassword('Demo1234'), role: 'admin',       createdAt: '2024-01-01T00:00:00Z', language: 'en', isVerified: true, provider: 'email' },
  ];

  saveUsers(demos);
}

// ─── OTP / Email Verification (mock) ─────────────────────────

interface PendingVerification {
  userId: string;
  email: string;
  otp: string;       // 6-digit code
  expiresAt: number; // Unix ms
}

function getPending(): PendingVerification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(VERIFY_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePending(list: PendingVerification[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VERIFY_KEY, JSON.stringify(list));
}

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerificationEmail(userId: string, email: string): Promise<{ otp: string }> {
  await delay(600);
  const otp = generateOTP();
  const list = getPending().filter((p) => p.userId !== userId); // remove old entry if any
  savePending([...list, { userId, email, otp, expiresAt: Date.now() + 10 * 60 * 1000 }]); // 10 min
  // In a real app: call email API here
  return { otp }; // Return OTP so the UI can show it in demo mode
}

export async function verifyEmail(
  userId: string,
  otp: string,
): Promise<{ success: boolean; error?: string }> {
  await delay(500);
  const list = getPending();
  const entry = list.find((p) => p.userId === userId);

  if (!entry) return { success: false, error: 'No pending verification found. Please request a new code.' };
  if (Date.now() > entry.expiresAt) return { success: false, error: 'This code has expired. Please request a new one.' };
  if (entry.otp !== otp.trim()) return { success: false, error: 'Incorrect code. Please try again.' };

  // Mark user as verified
  const users = getStoredUsers().map((u) =>
    u.id === userId ? { ...u, isVerified: true } : u
  );
  saveUsers(users);
  savePending(list.filter((p) => p.userId !== userId));

  // Auto-create session
  saveSession(userId);
  return { success: true };
}

export async function resendVerificationCode(userId: string, email: string): Promise<{ otp: string }> {
  return sendVerificationEmail(userId, email);
}

// ─── Auth API ────────────────────────────────────────────────

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  role: AuthUser['role'];
  phone?: string;
  district?: string;
}

export type AuthResult =
  | { success: true; user: AuthUser; requiresVerification?: boolean; demoOtp?: string }
  | { success: false; error: string; field?: string };

export async function signUp(payload: SignUpPayload): Promise<AuthResult> {
  seedDemoUsers();
  await delay(900);

  // --- Validation ---
  const nameErr = validateName(payload.name);
  if (nameErr) return { success: false, error: nameErr, field: 'name' };

  const emailErr = validateEmail(payload.email);
  if (emailErr) return { success: false, error: emailErr, field: 'email' };

  const passErr = validatePassword(payload.password);
  if (passErr) return { success: false, error: passErr, field: 'password' };

  const users = getStoredUsers();
  const exists = users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());
  if (exists) {
    if (!exists.isVerified) {
      // Resend verification instead of blocking
      const { otp } = await sendVerificationEmail(exists.id, exists.email);
      return {
        success: true,
        user: toAuthUser(exists),
        requiresVerification: true,
        demoOtp: otp,
      };
    }
    return { success: false, error: 'An account with this email already exists. Please sign in.', field: 'email' };
  }

  const newUser: StoredUser = {
    id: `user_${Date.now()}`,
    name: payload.name.trim(),
    email: payload.email.toLowerCase().trim(),
    passwordHash: hashPassword(payload.password),
    role: payload.role,
    phone: payload.phone,
    district: payload.district,
    createdAt: new Date().toISOString(),
    language: 'en',
    isVerified: false, // Must verify before first login
    provider: 'email',
  };

  saveUsers([...users, newUser]);

  // Send OTP verification
  const { otp } = await sendVerificationEmail(newUser.id, newUser.email);

  return {
    success: true,
    user: toAuthUser(newUser),
    requiresVerification: true,
    demoOtp: otp,
  };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  seedDemoUsers();
  await delay(900);

  // --- Validation ---
  const emailErr = validateEmail(email);
  if (emailErr) return { success: false, error: emailErr, field: 'email' };

  const passErr = validatePassword(password);
  if (passErr) return { success: false, error: passErr, field: 'password' };

  const users = getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    return { success: false, error: 'No account found with this email. Please register first.', field: 'email' };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Incorrect password. Please try again.', field: 'password' };
  }

  // Block unverified users — send a fresh OTP
  if (!user.isVerified) {
    const { otp } = await sendVerificationEmail(user.id, user.email);
    return {
      success: true,
      user: toAuthUser(user),
      requiresVerification: true,
      demoOtp: otp,
    };
  }

  saveSession(user.id);
  return { success: true, user: toAuthUser(user) };
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; demoToken?: string }> {
  seedDemoUsers();
  await delay(1200);

  const emailErr = validateEmail(email);
  if (emailErr) return { success: false, message: emailErr };

  const users = getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    // Security: don't reveal if email exists
    return { success: true, message: 'If that email is registered, a reset link has been sent.' };
  }

  // In real: send JWT reset link via email
  return {
    success: true,
    message: `Password reset link sent to ${email}. Check your inbox.`,
    demoToken: user.id,
  };
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  await delay(800);

  const passErr = validatePassword(newPassword);
  if (passErr) return { success: false, error: passErr, field: 'password' };

  const users = getStoredUsers();
  const user = users.find((u) => u.id === token);
  if (!user) return { success: false, error: 'Invalid or expired reset link. Please request a new one.' };

  const updated = users.map((u) =>
    u.id === token ? { ...u, passwordHash: hashPassword(newPassword) } : u
  );
  saveUsers(updated);
  saveSession(user.id);

  return { success: true, user: toAuthUser({ ...user, passwordHash: hashPassword(newPassword) }) };
}

export function signOut(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    seedDemoUsers();
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const users = getStoredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    // If session exists but user is not verified, reject it
    if (!user.isVerified) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return toAuthUser(user);
  } catch {
    return null;
  }
}

// ─── Google OAuth (mock — simulates OAuth flow) ───────────────
//
// In a real deployment this would use Firebase Auth / NextAuth
// with a Google provider. Here we simulate:
//   1. Generating a unique Google profile (deterministic by "account chosen")
//   2. Marking the user as verified (Google verifies emails)
//   3. Creating / reusing an account and creating a session

export async function signInWithGoogle(
  /** Optional: which Google account to simulate (for testing) */
  simulatedEmail?: string,
): Promise<AuthResult> {
  await delay(1500); // Simulate OAuth round-trip

  seedDemoUsers();

  // In demo mode we generate a plausible profile
  const ts = Date.now();
  const googleEmail = simulatedEmail ?? `google.user.${ts}@gmail.com`;
  const googleName  = simulatedEmail
    ? simulatedEmail.split('@')[0].replace(/[.\-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Google User';

  // Validate the Google email the same way (catches edge cases)
  const emailErr = validateEmail(googleEmail);
  if (emailErr) return { success: false, error: emailErr };

  const users = getStoredUsers();
  let user = users.find((u) => u.email.toLowerCase() === googleEmail.toLowerCase());

  if (!user) {
    // Auto-register: Google accounts are pre-verified
    user = {
      id: `google_${ts}`,
      name: googleName,
      email: googleEmail.toLowerCase(),
      passwordHash: hashPassword(`google_oauth_${ts}`),
      role: 'citizen',
      createdAt: new Date().toISOString(),
      language: 'en',
      isVerified: true, // Google verifies emails — no OTP needed
      provider: 'google',
    };
    saveUsers([...users, user]);
  } else {
    // Existing user who signed in with Google before (or registered with same email)
    // Mark as verified (linking accounts)
    const updated = users.map((u) =>
      u.id === user!.id ? { ...u, isVerified: true, provider: 'google' as const } : u
    );
    saveUsers(updated);
    user = { ...user, isVerified: true, provider: 'google' };
  }

  saveSession(user.id);
  return { success: true, user: toAuthUser(user) };
}

// ─── Helpers ─────────────────────────────────────────────────

function saveSession(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, userId);
  }
}

function toAuthUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    district: u.district,
    createdAt: u.createdAt,
    lastActive: new Date().toISOString(),
    isActive: true,
    isVerified: u.isVerified,
    language: u.language,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
