import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth, isFounderEmail } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Particles } from '@/components/Particles';

export function AdminLoginPage() {
  const { signIn, signUp, user: currentUser, adminProfile, session } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && currentUser) {
      if (isFounderEmail(currentUser.email) || (adminProfile?.approved && (adminProfile?.role === 'admin' || adminProfile?.role === 'founder'))) {
        navigate('/admin/dashboard', { replace: true });
      } else if (adminProfile?.role === 'user') {
        navigate('/', { replace: true });
      }
    }
  }, [session, currentUser, adminProfile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error, profile } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast('error', error);
      } else {
        const isFounder = isFounderEmail(email);
        if (profile?.role === 'user' && !isFounder) {
          toast('error', 'This account has community user access, not admin privileges.');
          navigate('/');
          return;
        }
        if (profile && !profile.approved && !isFounder) {
          toast('info', 'Your admin account is awaiting approval.');
        } else {
          toast('success', isFounder ? 'Welcome back, Founder!' : 'Welcome back, Admin!');
        }
        navigate('/admin/dashboard');
      }
    } else {
      if (password.length < 6) {
        toast('error', 'Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      // Explicitly register as 'admin' requesting founder approval
      const { error, profile } = await signUp(email, password, 'admin');
      setLoading(false);
      if (error) {
        toast('error', error);
      } else {
        if (profile && !profile.approved) {
          toast('success', 'Admin application submitted! Waiting for founder approval.');
        } else {
          toast('success', 'Account created! Welcome, Admin.');
        }
        navigate('/admin/dashboard');
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-ink-900">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <Particles count={30} className="absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Banner for normal players */}
        <div className="glass p-3 mb-4 border border-neon/20 flex items-center justify-between text-xs font-body">
          <span className="text-bone/70">Looking for normal player account?</span>
          <a
            href="/login?mode=signup"
            className="text-neon font-bold hover:underline flex items-center gap-1"
          >
            Player Sign Up
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        <div className="hud-panel p-8">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 border border-flame/30 text-flame mb-4 animate-pulse-glow">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="font-display text-2xl font-black text-bone tracking-wider">
              {mode === 'login' ? 'ADMIN ACCESS' : 'APPLY FOR ADMIN'}
            </h1>
            <p className="text-bone/40 font-mono text-xs uppercase tracking-widest mt-2">
              BUSSID Ventures Control Center
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'login' ? 'bg-flame/10 text-flame border-b-2 border-flame' : 'text-bone/40 hover:text-bone'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'signup' ? 'bg-flame/10 text-flame border-b-2 border-flame' : 'text-bone/40 hover:text-bone'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Apply Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bussid.com"
                  className="input-hud pl-11"
                />
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/30" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-hud pl-11"
                />
              </div>
              {mode === 'signup' && (
                <p className="mt-1.5 text-bone/30 text-xs font-mono">Minimum 6 characters</p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-flame w-full group disabled:opacity-50">
              {loading ? 'Please wait...' : mode === 'login' ? 'Enter Dashboard' : 'Submit Admin Application'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p className="mt-6 text-center text-bone/30 text-xs font-body">
            {mode === 'login' ? (
              <>
                Need admin access?{' '}
                <button onClick={() => setMode('signup')} className="text-flame hover:underline">
                  Apply here
                </button>
              </>
            ) : (
              <>
                Already an admin?{' '}
                <button onClick={() => setMode('login')} className="text-flame hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
          {mode === 'signup' && (
            <div className="mt-4 p-3 bg-flame/5 border border-flame/20 text-center">
              <p className="text-bone/60 text-xs font-body leading-relaxed">
                Admin accounts require verification and approval by the Founder before granting control center access.
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <a href="/login" className="inline-flex items-center gap-1.5 text-bone/40 hover:text-neon text-xs font-body transition-colors">
              <LogIn className="h-3.5 w-3.5" />
              Back to Player Sign In
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
