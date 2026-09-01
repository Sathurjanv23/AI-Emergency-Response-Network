'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { NovaLogo } from '@/components/shared/TopNav';
import {
  Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resetPassword, validatePassword, validateConfirmPassword, getPasswordStrength } from '@/lib/auth';
import { useNovaStore } from '@/lib/store/nova-store';
import { toast } from 'sonner';

// ─── Password Strength Bar ────────────────────────────────────

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= strength.score ? strength.color : '#1a2744' }}
          />
        ))}
      </div>
      <p className="text-[10px]" style={{ color: strength.color }}>
        {strength.label && `Password strength: ${strength.label}`}
      </p>
    </div>
  );
}

// ─── Field Component ──────────────────────────────────────────

function Field({
  id, label, type = 'text', value, onChange, error, placeholder, suffix,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string | null;
  placeholder?: string; suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-nova-text-dim block mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nova-text-muted pointer-events-none" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className={cn(
            'w-full bg-nova-surface border rounded-xl pl-10 py-2.5 text-sm text-nova-text placeholder:text-nova-text-muted focus:outline-none transition-all',
            suffix ? 'pr-11' : 'pr-4',
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

// ─── Inner content (uses useSearchParams, must be in Suspense) ─

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useNovaStore();

  // In a real app the token comes from the reset email link: ?token=<jwt>
  // In demo mode we embed the userId directly as the token
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // If no token, show an error state
  const noToken = !token;

  const validate = (): boolean => {
    const pErr = validatePassword(password);
    const cErr = validateConfirmPassword(password, confirmPassword);
    setPasswordError(pErr);
    setConfirmError(cErr);
    return !pErr && !cErr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (!result.success) {
      setGlobalError(result.error);
      return;
    }

    // Auto sign-in with the new credentials
    login({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      language: result.user.language,
      createdAt: result.user.createdAt,
      lastActive: result.user.lastActive,
      isActive: true,
    });

    setSuccess(true);
    toast.success('Password updated!', { description: 'You are now signed in.' });

    const ROLE_HREF: Record<string, string> = {
      citizen: '/citizen',
      officer: '/command',
      rescue_team: '/rescue',
      hospital: '/hospital',
      admin: '/admin',
    };

    setTimeout(() => {
      router.push(ROLE_HREF[result.user.role] ?? '/');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-nova-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated BG */}
      <div className="absolute inset-0 hero-grid-bg opacity-20 pointer-events-none" />
      <motion.div
        className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(0,212,255,0.05)' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'rgba(139,92,246,0.04)' }}
        animate={{ scale: [1.1, 1, 1.1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="nova-card border border-nova-border rounded-2xl p-8 shadow-nova">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <NovaLogo size="md" />
          </div>

          <AnimatePresence mode="wait">
            {/* ─ No Token State ─ */}
            {noToken && (
              <motion.div key="no-token" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-nova-text mb-2">Invalid Reset Link</h1>
                <p className="text-sm text-nova-text-dim mb-6 leading-relaxed">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link
                  href="/forgot-password"
                  className="w-full bg-nova-cyan text-nova-bg font-bold py-3 rounded-xl hover:bg-nova-cyan-dim transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Request New Reset Link
                </Link>
                <div className="flex justify-center mt-4">
                  <Link href="/login" className="flex items-center gap-1.5 text-xs text-nova-text-muted hover:text-nova-text transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ─ Success State ─ */}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-5">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </motion.div>
                  </motion.div>
                </div>
                <h2 className="text-xl font-bold text-nova-text mb-2">Password Reset!</h2>
                <p className="text-sm text-nova-text-dim leading-relaxed">
                  Your password has been updated successfully. Redirecting you to your dashboard…
                </p>
                <div className="flex justify-center mt-4">
                  <Loader2 className="w-5 h-5 text-nova-cyan animate-spin" />
                </div>
              </motion.div>
            )}

            {/* ─ Reset Form ─ */}
            {!noToken && !success && (
              <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-nova-cyan/10 border border-nova-cyan/20 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-nova-cyan" />
                  </div>
                </div>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-nova-text">Set New Password</h1>
                  <p className="text-sm text-nova-text-dim mt-1.5 leading-relaxed">
                    Choose a strong password for your NOVA account.
                  </p>
                </div>

                {/* Global error */}
                <AnimatePresence>
                  {globalError && (
                    <motion.div
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4"
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0" /> {globalError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <Field
                      id="new-password"
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(v) => { setPassword(v); setPasswordError(null); }}
                      error={passwordError}
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
                    <PasswordStrengthMeter password={password} />
                    {password && (
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {[
                          { met: password.length >= 8, text: '8+ characters' },
                          { met: /[A-Z]/.test(password), text: 'Uppercase letter' },
                          { met: /[0-9]/.test(password), text: 'Number' },
                          { met: /[^A-Za-z0-9]/.test(password), text: 'Special char (optional)' },
                        ].map(({ met, text }) => (
                          <div key={text} className={cn('flex items-center gap-1.5 text-[10px] transition-colors', met ? 'text-green-400' : 'text-nova-text-muted')}>
                            {met ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-nova-border" />}
                            {text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Field
                    id="confirm-new-password"
                    label="Confirm New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(v) => { setConfirmPassword(v); setConfirmError(null); }}
                    error={confirmError}
                    placeholder="••••••••"
                  />

                  <motion.button
                    id="reset-password-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full bg-nova-cyan text-nova-bg font-bold py-3 rounded-xl hover:bg-nova-cyan-dim transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.99 } : {}}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Updating Password…</>
                    ) : (
                      'Reset Password'
                    )}
                  </motion.button>
                </form>

                <div className="flex justify-center mt-5">
                  <Link href="/login" className="flex items-center gap-1.5 text-xs text-nova-text-muted hover:text-nova-text transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                </div>
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

// ─── Page Wrapper (Suspense boundary for useSearchParams) ─────

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-nova-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-nova-cyan animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
