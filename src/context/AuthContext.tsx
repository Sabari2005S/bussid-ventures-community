import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type AdminProfile } from '@/lib/supabase';

const envFounder = (import.meta.env.VITE_FOUNDER_EMAIL || '').trim().toLowerCase();
export const KNOWN_FOUNDER_EMAILS = [
  'sabarishnadar2005@gmail.com',
  ...(envFounder ? [envFounder] : []),
];

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return KNOWN_FOUNDER_EMAILS.includes(email.trim().toLowerCase());
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  adminProfile: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile?: AdminProfile | null }>;
  signUp: (email: string, password: string, role?: 'user' | 'admin') => Promise<{ error: string | null; profile?: AdminProfile | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  async function fetchProfile(uid: string | undefined, knownEmail?: string): Promise<AdminProfile | null> {
    if (!uid) {
      setAdminProfile(null);
      return null;
    }

    const emailCandidate = (
      knownEmail ||
      user?.email ||
      (await supabase.auth.getUser()).data.user?.email ||
      ''
    ).toLowerCase().trim();

    const isDesignatedFounder = isFounderEmail(emailCandidate);

    try {
      const queryPromise = supabase.from('admin_profiles').select('*').eq('id', uid).maybeSingle();
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile query timeout') }), 6000)
      );
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      if (error) {
        console.warn('[BUSSID Ventures] Profile fetch notice:', error.message);
      }
      let profile = (data as AdminProfile | null) ?? null;

      if (isDesignatedFounder) {
        if (!profile || profile.role !== 'founder' || !profile.approved) {
          profile = {
            id: uid,
            email: emailCandidate || 'sabarishnadar2005@gmail.com',
            role: 'founder',
            approved: true,
            created_at: profile?.created_at || new Date().toISOString(),
          };

          // Auto-sync into admin_profiles in database
          supabase
            .from('admin_profiles')
            .upsert({
              id: uid,
              email: emailCandidate || 'sabarishnadar2005@gmail.com',
              role: 'founder',
              approved: true,
            })
            .then(({ error: upsertErr }) => {
              if (upsertErr) {
                console.warn('[BUSSID Ventures] Auto-sync founder profile notice:', upsertErr.message);
              }
            });
        }
      } else if (profile?.role === 'pending') {
        // Auto-heal: If this user registered as a regular player/user, activate their user profile
        const authUserMeta = user?.user_metadata || (await supabase.auth.getUser()).data.user?.user_metadata;
        const requestedRole = authUserMeta?.role;
        if (requestedRole === 'user' || !requestedRole) {
          profile = {
            ...profile,
            role: 'user',
            approved: true,
          };
          supabase.rpc('ensure_user_profile').catch(() => {
            supabase
              .from('admin_profiles')
              .update({ role: 'user', approved: true })
              .eq('id', uid)
              .catch(() => {});
          });
        }
      }

      setAdminProfile(profile);
      return profile;
    } catch (err) {
      console.warn('[BUSSID Ventures] Profile fetch exception:', err);
      if (isDesignatedFounder) {
        const founderProfile: AdminProfile = {
          id: uid,
          email: emailCandidate || 'sabarishnadar2005@gmail.com',
          role: 'founder',
          approved: true,
          created_at: new Date().toISOString(),
        };
        setAdminProfile(founderProfile);
        return founderProfile;
      }
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
          await fetchProfile(data.session.user.id, data.session.user.email);
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
        await fetchProfile(sess.user.id, sess?.user?.email);
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
        profile = await fetchProfile(data.user.id, data.user.email || email);
      }
    }
    return { error: null, profile };
  }

  async function signUp(
    email: string,
    password: string,
    role: 'user' | 'admin' = 'user'
  ): Promise<{ error: string | null; profile?: AdminProfile | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
        },
      },
    });
    if (error) {
      return { error: error.message, profile: null };
    }
    let profile: AdminProfile | null = null;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user?.id) {
        if (role === 'user') {
          // Immediately ensure user profile in DB
          try {
            await supabase.rpc('ensure_user_profile');
          } catch {
            try {
              await supabase
                .from('admin_profiles')
                .upsert({
                  id: data.user.id,
                  email: data.user.email || email,
                  role: 'user',
                  approved: true,
                });
            } catch {}
          }
        }
        profile = await fetchProfile(data.user.id, data.user.email || email);
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
