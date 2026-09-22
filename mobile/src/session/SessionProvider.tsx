import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onUnauthorized, setAuthToken } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { storage } from '@/lib/storage';

/**
 * Demo session. The backend exposes a development phone login instead of OTP, so the
 * app signs in as the seeded demo user automatically and lets you switch users from
 * the Profile tab, which is handy for showing multi-user behaviour.
 */
export const DEMO_PHONE = '+919000000001';
const SESSION_KEY = 'feedants.session';

type Session = {
  user: SessionUser | null;
  status: 'loading' | 'signedIn' | 'error';
  signIn: (phone: string, name?: string) => Promise<void>;
  retry: () => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Session['status']>('loading');

  const signIn = useCallback(
    async (phone: string, name?: string) => {
      const res = await api<{ token: string; user: SessionUser }>('/auth/dev-login', {
        method: 'POST',
        body: { phone, ...(name && { name }) },
      });
      setAuthToken(res.token);
      await storage.set(SESSION_KEY, JSON.stringify(res));
      setUser(res.user);
      setStatus('signedIn');
      // Everything personal must be refetched as the new user.
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  // Bumped by retry() to re-run the restore effect.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await storage.get(SESSION_KEY);
        if (cancelled) return;
        if (saved) {
          const parsed = JSON.parse(saved) as { token: string; user: SessionUser };
          setAuthToken(parsed.token);
          setUser(parsed.user);
          setStatus('signedIn');
          return;
        }
        await signIn(DEMO_PHONE, 'Demo User');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signIn, attempt]);

  // Token rejected by the server: forget it and sign in again (once per rejection burst).
  useEffect(() => {
    onUnauthorized(() => {
      setAuthToken(null);
      storage.remove(SESSION_KEY).finally(() => {
        setStatus('loading');
        setAttempt((a) => a + 1);
      });
    });
    return () => onUnauthorized(null);
  }, []);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo(() => ({ user, status, signIn, retry }), [user, status, signIn, retry]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
