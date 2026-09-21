import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Lock, Mail, ArrowRight, UserPlus, LogIn, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Particles } from '@/components/Particles';

export function UserLoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qMode = searchParams.get('mode');
    if (qMode === 'signup' || qMode === 'login') {
      setMode(qMode);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast('error', error);
      } else {
        toast('success', 'Welcome back!');
        navigate('/');
      }
    } else {
      if (password.length < 6) {
        toast('error', 'Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      // Explicitly register as 'user' for instant community player access
      const { error } = await signUp(email, password, 'user');
      setLoading(false);
      if (error) {
        toast('error', error);
      } else {
        toast('success', 'Account created! Welcome to BUSSID Ventures.');
        navigate('/');
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
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <Bus className="h-7 w-7 text-neon drop-shadow-[0_0_6px_rgba(124,255,0,0.6)]" />
              <div className="font-display text-sm font-black tracking-wider leading-none">
                <span className="text-bone">BUSSID</span>{' '}
                <span className="text-neon">VENTURES</span>
              </div>
            </Link>
            <h1 className="font-display text-2xl font-black text-bone tracking-wider">
              {mode === 'login' ? 'PLAYER SIGN IN' : 'CREATE PLAYER ACCOUNT'}
            </h1>
            <p className="text-bone/40 font-mono text-xs uppercase tracking-widest mt-2">
              {mode === 'login' ? 'Sign in to upload liveries & join convoys' : 'Instant free player access to the community'}
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
              Register
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
                  placeholder="you@example.com"
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
                <p className="mt-1.5 text-bone/30 text-xs font-mono">Minimum 6 characters • Instant activation</p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-neon w-full group disabled:opacity-50">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Player Account'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p className="mt-6 text-center text-bone/30 text-xs font-body">
            {mode === 'login' ? (
              <>
                No account yet?{' '}
                <button onClick={() => setMode('signup')} className="text-neon hover:underline">
                  Create Player Account
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

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-bone/40 text-xs font-body mb-1.5">Staff or Administrator?</p>
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-bone/50 hover:text-flame text-xs font-body transition-colors">
              <Shield className="h-3.5 w-3.5" />
              Admin Portal
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
