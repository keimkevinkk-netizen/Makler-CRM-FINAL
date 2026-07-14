/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabaseConfig } from '../config/runtime';
import { SupabaseRestAuthClient, type CloudAuthSession, type WorkspaceMembership } from './cloudAuth';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: CloudAuthSession | null;
  membership: WorkspaceMembership | null;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  acceptInvitation: (token: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new SupabaseRestAuthClient(supabaseConfig), []);
  const [session, setSession] = useState<CloudAuthSession | null>(null);
  const [membership, setMembership] = useState<WorkspaceMembership | null>(null);
  const [loading, setLoading] = useState(supabaseConfig.configured);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!supabaseConfig.configured) return;

    void client.restoreSession()
      .then(async (restored) => {
        if (!active || !restored) return;
        setSession(restored);
        try {
          const resolvedMembership = await client.getMembership(restored);
          if (active) setMembership(resolvedMembership);
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : 'Eine Workspace-Einladung wird benötigt.');
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Die Sitzung konnte nicht wiederhergestellt werden.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    configured: supabaseConfig.configured,
    loading,
    session,
    membership,
    error,
    signIn: async (email, password) => {
      setLoading(true);
      setError('');
      try {
        const authenticated = await client.signIn(email, password);
        setSession(authenticated);
        try {
          const resolvedMembership = await client.getMembership(authenticated);
          setMembership(resolvedMembership);
        } catch (reason) {
          setMembership(null);
          setError(reason instanceof Error ? reason.message : 'Bitte ein gültiges Einladungstoken eingeben.');
        }
      } catch (reason) {
        await client.signOut(null);
        setSession(null);
        setMembership(null);
        const message = reason instanceof Error ? reason.message : 'Die Anmeldung ist fehlgeschlagen.';
        setError(message);
        throw new Error(message, { cause: reason });
      } finally {
        setLoading(false);
      }
    },
    acceptInvitation: async (token, displayName) => {
      if (!session) throw new Error('Für die Einladung ist zuerst eine Anmeldung erforderlich.');
      setLoading(true);
      setError('');
      try {
        setMembership(await client.acceptInvitation(session, token, displayName));
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Die Einladung konnte nicht angenommen werden.';
        setError(message);
        throw new Error(message, { cause: reason });
      } finally {
        setLoading(false);
      }
    },
    signOut: async () => {
      setLoading(true);
      await client.signOut(session);
      setSession(null);
      setMembership(null);
      setError('');
      setLoading(false);
    },
  }), [client, error, loading, membership, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
