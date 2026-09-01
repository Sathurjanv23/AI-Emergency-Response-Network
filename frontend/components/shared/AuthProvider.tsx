'use client';

import { useEffect } from 'react';
import { useNovaStore } from '@/lib/store/nova-store';
import { getSession } from '@/lib/auth';

/**
 * AuthProvider — Mounts once in the layout and rehydrates the auth session
 * from localStorage so users stay logged in across page refreshes.
 * Only rehydrates if the session is for a VERIFIED user.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, isAuthenticated } = useNovaStore();

  useEffect(() => {
    if (!isAuthenticated) {
      const session = getSession(); // Already rejects unverified users internally
      if (session && session.isVerified) {
        login({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          language: session.language,
          createdAt: session.createdAt,
          lastActive: session.lastActive,
          isActive: session.isActive,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
