'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NovaLogo } from '@/components/shared/TopNav';
import {
  Eye, EyeOff, Shield, AlertTriangle, Truck, Building2, Settings,
  Mail, Lock, ArrowRight, CheckCircle, XCircle, Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { useNovaStore } from '@/lib/store/nova-store';
import { toast } from 'sonner';
import {
  signIn, signInWithGoogle, signOut,
  validateEmail, validatePassword,
  verifyEmail, resendVerificationCode,
} from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

// ─── Google Icon SVG ──────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Role Configs ─────────────────────────────────────────────

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ReactNode; color: string; href: string }[] = [
  { value: 'citizen',     label: 'Citizen',           desc: 'Report emergencies & track response', icon: <Shield className="w-4 h-4" />,       color: 'border-nova-cyan/60 text-nova-cyan bg-nova-cyan/10',      href: '/citizen' },
  { value: 'officer',     label: 'Emergency Officer', desc: 'Command center & coordination',       icon: <AlertTriangle className="w-4 h-4" />, color: 'border-purple-400/60 text-purple-400 bg-purple-400/10', href: '/command' },
  { value: 'rescue_team', label: 'Rescue Team',       desc: 'Field operations & response',         icon: <Truck className="w-4 h-4" />,         color: 'border-orange-400/60 text-orange-400 bg-orange-400/10',  href: '/rescue' },
  { value: 'hospital',    label: 'Hospital',          desc: 'Medical coordination & triage',        icon: <Building2 className="w-4 h-4" />,     color: 'border-pink-400/60 text-pink-400 bg-pink-400/10',        href: '/hospital' },
  { value: 'admin',       label: 'Administrator',     desc: 'System management & config',          icon: <Settings className="w-4 h-4" />,      color: 'border-red-400/60 text-red-400 bg-red-400/10',           href: '/admin' },
];

const DEMO_CREDS: Record<UserRole, { email: string; password: string }> = {
  citizen:     { email: 'citizen@nova.lk',  password: 'Demo1234' },
  officer:     { email: 'officer@nova.lk',  password: 'Demo1234' },
  rescue_team: { email: 'rescue@nova.lk',   password: 'Demo1234' },
  hospital:    { email: 'hospital@nova.lk', password: 'Demo1234' },
  admin:       { email: 'admin@nova.lk',    password: 'Demo1234' },
};

// ─── Field Input ─────────────────────────────────────────────

function Field({
  id, label, type = 'text', value, onChange, error, icon, placeholder, suffix,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string | null; icon?: React.ReactNode;
  placeholder?: string; suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-nova-text-dim block mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nova-text-muted pointer-events-none">{icon}</span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
          className={cn(
            'w-full bg-nova-surface border rounded-xl py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none transition-all',
            icon ? 'pl-10 pr-4' : 'px-4',
            suffix ? 'pr-11' : '',
            error
              ? 'border-red-500/60 focus:border-red-500 bg-red-500/5'
              : 'border-nova-border focus:border-nova-cyan/50 focus:bg-nova-surface2'
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            className="flex items-center gap-1 text-[11px] text-red-400 mt-1"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <XCircle className="w-3 h-3 flex-shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── OTP Verification Screen ──────────────────────────────────

function OtpVerificationScreen({
  user,
  demoOtp,
  onSuccess,
  onBack,
}: {
  user: AuthUser;
  demoOtp?: string;
  onSuccess: (u: AuthUser) => void;
  onBack: () => void;
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [currentDemoOtp, setCurrentDemoOtp] = useState(demoOtp ?? '');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    setResendCooldown(30);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError(null);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    pasted.split('').forEach((d, i) => { if (i < 6) next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await verifyEmail(user.id, code);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    toast.success('Email verified!', { description: 'Welcome to PROJECT NOVA.' });
    onSuccess({ ...user, isVerified: true });
  };

  const handleResend = async () => {
    setResending(true);
    const { otp: newOtp } = await resendVerificationCode(user.id, user.email);
    setResending(false);
    setCurrentDemoOtp(newOtp);
    setResendCooldown(30);
    setOtp(['', '', '', '', '', '']);
    setError(null);
    toast.success('New code sent!', { description: 'Check your email for the 6-digit code.' });
  };

  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-5"
    >
      {/* Icon */}
      <div className="flex justify-center mb-2">
        <div className="w-16 h-16 rounded-2xl bg-nova-cyan/10 border border-nova-cyan/20 flex items-center justify-center">
          <Mail className="w-8 h-8 text-nova-cyan" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-nova-text">Verify Your Email</h2>
        <p className="text-sm text-nova-text-dim mt-1.5 leading-relaxed">
          We sent a 6-digit code to<br />
          <span className="text-nova-cyan font-semibold">{user.email}</span>
        </p>
      </div>

      {/* Demo OTP hint */}
      {currentDemoOtp && (
        <div className="p-3 rounded-xl bg-nova-cyan/5 border border-nova-cyan/20 text-xs text-center">
          <p className="text-nova-text-muted">💡 Demo mode — your code is:</p>
          <button
            onClick={() => {
              const digits = currentDemoOtp.split('');
              setOtp(digits);
              setTimeout(() => inputRefs.current[5]?.focus(), 50);
            }}
            className="text-nova-cyan font-mono text-2xl font-bold tracking-[0.3em] mt-1 hover:text-nova-cyan-dim transition-colors"
          >
            {currentDemoOtp}
          </button>
          <p className="text-nova-text-muted mt-1">Click the code to auto-fill</p>
        </div>
      )}

      {/* OTP boxes */}
      <div className="flex justify-center gap-2">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={cn(
              'w-11 h-12 text-center text-lg font-bold border rounded-xl bg-nova-surface text-nova-text focus:outline-none transition-all',
              digit ? 'border-nova-cyan bg-nova-cyan/10' : 'border-nova-border focus:border-nova-cyan/50'
            )}
          />
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verify button */}
      <motion.button
        id="otp-verify-btn"
        onClick={handleVerify}
        disabled={loading || otp.join('').length < 6}
        className="w-full bg-nova-cyan text-nova-bg font-bold py-3 rounded-xl hover:bg-nova-cyan-dim transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        whileHover={!loading ? { scale: 1.01 } : {}}
        whileTap={!loading ? { scale: 0.99 } : {}}
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <><CheckCircle className="w-4 h-4" /> Verify & Sign In</>}
      </motion.button>

      {/* Resend */}
      <div className="flex items-center justify-between text-xs">
        <button onClick={onBack} className="text-nova-text-muted hover:text-nova-text transition-colors">
          ← Use different email
        </button>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className="flex items-center gap-1.5 text-nova-cyan hover:underline disabled:text-nova-text-muted disabled:no-underline transition-colors"
        >
          {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Login Page ─────────────────────────────────────────

type LoginStep = 'credentials' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, currentUser } = useNovaStore();

  // If already logged in, redirect
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const ROLE_HREF: Record<UserRole, string> = {
        citizen: '/citizen', officer: '/command', rescue_team: '/rescue',
        hospital: '/hospital', admin: '/admin',
      };
      router.replace(ROLE_HREF[currentUser.role] ?? '/');
    }
  }, [isAuthenticated, currentUser, router]);

  const [step, setStep] = useState<LoginStep>('credentials');
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | undefined>();

  const [selectedRole, setSelectedRole] = useState<UserRole>('officer');
  const [email, setEmail] = useState('officer@nova.lk');
  const [password, setPassword] = useState('Demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(DEMO_CREDS[role].email);
    setPassword(DEMO_CREDS[role].password);
    setEmailError(null);
    setPasswordError(null);
    setGlobalError(null);
  };

  const validate = (): boolean => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    return !eErr && !pErr;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      if (result.field === 'email') setEmailError(result.error);
      else if (result.field === 'password') setPasswordError(result.error);
      else setGlobalError(result.error);
      return;
    }

    // Needs email verification
    if (result.requiresVerification) {
      setPendingUser(result.user);
      setDemoOtp(result.demoOtp);
      setStep('otp');
      return;
    }

    // Successfully authenticated
    doLogin(result.user);
  };

  const handleVerifySuccess = (user: AuthUser) => {
    doLogin(user);
  };

  const doLogin = (user: AuthUser) => {
    login({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
      isActive: true,
    });

    const roleConfig = ROLES.find((r) => r.value === user.role)!;
    toast.success(`Welcome back, ${user.name}!`, { description: `Signed in as ${roleConfig.label}` });
    router.push(roleConfig.href);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setGlobalError(null);
    const result = await signInWithGoogle();
    setGoogleLoading(false);

    if (!result.success) {
      setGlobalError(result.error);
      return;
    }

    // Google accounts are always pre-verified
    doLogin(result.user);
    toast.success('Signed in with Google!', { description: `Welcome, ${result.user.name}` });
  };

  const ROLE_HREF: Record<UserRole, string> = {
    citizen: '/citizen', officer: '/command', rescue_team: '/rescue',
    hospital: '/hospital', admin: '/admin',
  };

  return (
    <div className="min-h-screen bg-nova-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated BG */}
      <div className="absolute inset-0 hero-grid-bg opacity-20 pointer-events-none" />
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(0,212,255,0.05)' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'rgba(139,92,246,0.05)' }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
      />

      <motion.div
        className="w-full max-w-lg relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Card */}
        <div className="nova-card border border-nova-border rounded-2xl p-8 shadow-nova">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <NovaLogo size="md" />
            </div>
            <h1 className="text-2xl font-bold text-nova-text">Sign In to NOVA</h1>
            <p className="text-xs text-nova-text-dim mt-1">AI Emergency Response Network</p>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── OTP step ─── */}
            {step === 'otp' && pendingUser && (
              <OtpVerificationScreen
                user={pendingUser}
                demoOtp={demoOtp}
                onSuccess={handleVerifySuccess}
                onBack={() => { setStep('credentials'); setPendingUser(null); }}
              />
            )}

            {/* ─── Credentials step ─── */}
            {step === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Google SSO */}
                <motion.button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full flex items-center justify-center gap-3 border border-nova-border rounded-xl py-2.5 text-sm font-medium text-nova-text hover:bg-nova-surface2 hover:border-nova-border2 transition-all disabled:opacity-50 mb-5"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="w-4 h-4" />
                  )}
                  {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
                </motion.button>

                {/* Divider */}
                <div className="relative flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-nova-border" />
                  <span className="text-[10px] text-nova-text-muted uppercase tracking-wider">or sign in with email</span>
                  <div className="flex-1 h-px bg-nova-border" />
                </div>

                {/* Role Selector */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-nova-text-muted uppercase tracking-wider mb-2.5">Your Role</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ROLES.map((role) => (
                      <button
                        key={role.value}
                        id={`role-${role.value}`}
                        type="button"
                        onClick={() => handleRoleSelect(role.value)}
                        title={role.label}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-center',
                          selectedRole === role.value
                            ? role.color
                            : 'border-nova-border text-nova-text-muted hover:border-nova-border2 hover:text-nova-text'
                        )}
                      >
                        {role.icon}
                        <span className="text-[9px] font-semibold leading-tight">{role.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-nova-text-muted mt-1.5 text-center">
                    Selected: <span className="text-nova-text">{ROLES.find(r => r.value === selectedRole)?.label}</span>
                  </p>
                </div>

                {/* Global Error */}
                <AnimatePresence>
                  {globalError && (
                    <motion.div
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4"
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      {globalError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  <Field
                    id="email"
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(v) => { setEmail(v); setEmailError(null); setGlobalError(null); }}
                    error={emailError}
                    icon={<Mail className="w-4 h-4" />}
                    placeholder="you@nova.lk"
                  />
                  <Field
                    id="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(v) => { setPassword(v); setPasswordError(null); setGlobalError(null); }}
                    error={passwordError}
                    icon={<Lock className="w-4 h-4" />}
                    placeholder="••••••••"
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-nova-text-muted hover:text-nova-text transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  {/* Forgot Password */}
                  <div className="flex justify-end -mt-1">
                    <Link href="/forgot-password" className="text-xs text-nova-cyan hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  {/* Demo hint */}
                  <div className="p-3 rounded-xl bg-nova-cyan/5 border border-nova-cyan/15 text-xs text-nova-text-dim">
                    💡 <strong className="text-nova-cyan">Demo Mode:</strong>{' '}
                    Credentials auto-filled for <em>{ROLES.find(r => r.value === selectedRole)?.label}</em>. Just click Sign In.
                  </div>

                  <motion.button
                    id="signin-submit-btn"
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full bg-nova-cyan text-nova-bg font-bold py-3 rounded-xl hover:bg-nova-cyan-dim transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.99 } : {}}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
                    ) : (
                      <>Sign In to NOVA <ArrowRight className="w-4 h-4" /></>
                    )}
                  </motion.button>
                </form>

                <p className="text-center text-xs text-nova-text-muted mt-5">
                  New to NOVA?{' '}
                  <Link href="/register" className="text-nova-cyan hover:underline font-medium">
                    Create an account
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[10px] text-nova-text-muted mt-4">
          SIMULATION DEMO · Not a real government system · Team Code Catalyst
        </p>
      </motion.div>
    </div>
  );
}
