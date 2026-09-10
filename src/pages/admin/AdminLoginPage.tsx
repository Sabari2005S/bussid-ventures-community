import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Particles } from '@/components/Particles';

export function AdminLoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast('error', error);
      } else {
        toast('success', 'Welcome back, Admin!');
        navigate('/admin/dashboard');
      }
    } else {
      if (password.length < 6) {
        toast('error', 'Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        toast('error', error);
      } else {
        toast('success', 'Account created! You are now logged in.');
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
        <div className="hud-panel p-8">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 border border-neon/30 text-neon mb-4 animate-pulse-glow">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="font-display text-2xl font-black text-bone tracking-wider">
              {mode === 'login' ? 'ADMIN ACCESS' : 'CREATE ADMIN'}
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
                mode === 'login' ? 'bg-neon/10 text-neon' : 'text-bone/40 hover:text-bone'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'signup' ? 'bg-neon/10 text-neon' : 'text-bone/40 hover:text-bone'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create Account
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
            <button type="submit" disabled={loading} className="btn-neon w-full group disabled:opacity-50">
              {loading ? 'Please wait...' : mode === 'login' ? 'Enter Dashboard' : 'Create Account'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p className="mt-6 text-center text-bone/30 text-xs font-body">
            {mode === 'login' ? (
              <>
                No account yet?{' '}
                <button onClick={() => setMode('signup')} className="text-neon hover:underline">
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-neon hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
          {mode === 'signup' && (
            <p className="mt-4 text-center text-bone/30 text-xs font-body">
              The first account becomes the founder admin. All subsequent accounts require
              founder approval before accessing the dashboard.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
