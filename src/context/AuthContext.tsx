import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type AdminProfile } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  adminProfile: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  async function fetchProfile(uid: string | undefined) {
    if (!uid) {
      setAdminProfile(null);
      return;
    }
    const { data } = await supabase.from('admin_profiles').select('*').eq('id', uid).maybeSingle();
    setAdminProfile(data as AdminProfile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      (async () => {
        await fetchProfile(data.session?.user?.id);
      })();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      (async () => {
        await fetchProfile(sess?.user?.id);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? error.message : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAdminProfile(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, adminProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
