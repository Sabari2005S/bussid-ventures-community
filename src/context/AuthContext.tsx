import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type AdminProfile } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  adminProfile: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile?: AdminProfile | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; profile?: AdminProfile | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  async function fetchProfile(uid: string | undefined): Promise<AdminProfile | null> {
    if (!uid) {
      setAdminProfile(null);
      return null;
    }
    try {
      const { data } = await supabase.from('admin_profiles').select('*').eq('id', uid).maybeSingle();
      const profile = (data as AdminProfile | null) ?? null;
      setAdminProfile(profile);
      return profile;
    } catch {
      setAdminProfile(null);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user?.id) {
          await fetchProfile(data.session.user.id);
        } else {
          setAdminProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user?.id) {
        await fetchProfile(sess.user.id);
      } else {
        setAdminProfile(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: string | null; profile?: AdminProfile | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message, profile: null };
    }
    let profile: AdminProfile | null = null;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user?.id) {
        profile = await fetchProfile(data.user.id);
      }
    }
    return { error: null, profile };
  }

  async function signUp(email: string, password: string): Promise<{ error: string | null; profile?: AdminProfile | null }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: error.message, profile: null };
    }
    let profile: AdminProfile | null = null;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user?.id) {
        profile = await fetchProfile(data.user.id);
      }
    }
    return { error: null, profile };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
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
