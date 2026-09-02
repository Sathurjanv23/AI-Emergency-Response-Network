'use client';

import { useEffect } from 'react';
import { useNovaStore } from '@/lib/store/nova-store';
import { getSession, getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * AuthProvider — Mounts once in the layout and rehydrates the auth session
 * from localStorage so users stay logged in across page refreshes.
 * Also initiates live data fetch and SSE real-time updates.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { login, isAuthenticated, fetchAllData, addIncident, updateIncident } = useNovaStore();

  useEffect(() => {
    if (!isAuthenticated) {
      const session = getSession();
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

    // Fetch live backend data
    fetchAllData();

    // Setup real-time SSE listener
    const token = getToken();
    let eventSource: EventSource | null = null;

    try {
      // Connect to SSE stream
      eventSource = new EventSource(`${API_BASE}/events/stream`);

      eventSource.addEventListener('incident_created', (e) => {
        try {
          const newIncident = JSON.parse(e.data);
          addIncident(newIncident);
        } catch {}
      });

      eventSource.addEventListener('incident_updated', (e) => {
        try {
          const updatedIncident = JSON.parse(e.data);
          updateIncident(updatedIncident.id, updatedIncident);
        } catch {}
      });
    } catch {
      // SSE connection error handled silently
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
