'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNovaStore } from '@/lib/store/nova-store';
import { getSession } from '@/lib/auth';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  /** If set, only users with one of these roles can access the route */
  allowedRoles?: UserRole[];
  /** Where to redirect unauthenticated users */
  redirectTo?: string;
}

const ROLE_HREF: Record<UserRole, string> = {
  citizen:     '/citizen',
  officer:     '/command',
  rescue_team: '/rescue',
  hospital:    '/hospital',
  admin:       '/admin',
};

/**
 * AuthGuard — Protects dashboard pages.
 * - Checks localStorage session on mount
 * - Rejects unverified users (redirects to /login)
 * - Enforces role-based access (redirects wrong roles to their own portal)
 */
export function AuthGuard({ children, allowedRoles, redirectTo = '/login' }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, currentUser, login } = useNovaStore();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    // 1. Prefer in-memory session (already verified by AuthProvider)
    let user = isAuthenticated && currentUser ? currentUser : null;

    // 2. Fall back to localStorage if store is empty
    if (!user) {
      const session = getSession(); // getSession() already rejects unverified users
      if (session) {
        // Hydrate store
        login({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          language: session.language,
          createdAt: session.createdAt,
          lastActive: session.lastActive,
          isActive: true,
        });
        user = session;
      }
    }

    // 3. No session → redirect to login
    if (!user) {
      router.replace(redirectTo);
      setStatus('unauthorized');
      return;
    }

    // 4. Role check
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(ROLE_HREF[user.role]);
      setStatus('unauthorized');
      return;
    }

    setStatus('authorized');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-nova-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-nova-cyan animate-spin" />
          <p className="text-sm text-nova-text-dim">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return null; // Router is handling the redirect
  }

  return <>{children}</>;
}
