import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Bus, Shield, LogIn, LogOut, User, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Livery', to: '/livery' },
  { label: 'Tournament', to: '/tournament' },
  { label: 'Groups', to: '/groups' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/livery?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass-strong shadow-hud' : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="group flex items-center gap-2.5">
              <div className="relative">
                <Bus className="h-7 w-7 text-neon drop-shadow-[0_0_6px_rgba(124,255,0,0.6)]" />
                <div className="absolute inset-0 animate-pulse-glow rounded-full bg-neon/20 blur-md" />
              </div>
              <div className="font-display text-sm font-black tracking-wider leading-none">
                <span className="text-bone">BUSSID</span>{' '}
                <span className="text-neon">VENTURES</span>
                <div className="text-[9px] tracking-[0.4em] text-bone/50 font-mono">COMMUNITY</div>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {NAV.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="relative px-4 py-2 font-display text-sm font-bold uppercase tracking-wider transition-colors duration-200"
                  >
                    <span className={active ? 'text-neon' : 'text-bone/70 hover:text-bone'}>{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-neon shadow-neon-sm"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => setSearchOpen((s) => !s)}
                className="p-2 text-bone/70 hover:text-neon transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    to="/my-uploads"
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-display font-bold uppercase tracking-wider text-neon border border-neon/30 hover:bg-neon/10 transition-all"
                  >
                    <User className="h-4 w-4" />
                    {user.email?.split('@')[0] ?? 'Account'}
                  </Link>
                  <Link
                    to="/my-downloads"
                    className="p-2 text-bone/70 hover:text-neon transition-colors"
                    aria-label="My Downloads"
                  >
                    <HardDrive className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-bone/70 hover:text-flame transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-display font-bold uppercase tracking-wider text-neon border border-neon/30 hover:bg-neon/10 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-display font-bold uppercase tracking-wider text-flame border border-flame/30 hover:bg-flame/10 transition-all"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden p-2 text-bone"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={submitSearch}
                className="overflow-hidden pb-3"
              >
                <div className="flex items-center gap-2 border border-neon/30 bg-ink-700/60 px-4 py-2.5">
                  <Search className="h-4 w-4 text-neon" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search liveries, creators, vehicles..."
                    className="flex-1 bg-transparent text-bone placeholder-bone/30 outline-none font-body"
                  />
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            <div className="absolute inset-0 bg-ink-900/95 backdrop-blur-xl" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-full max-w-sm glass-strong p-6"
            >
              <div className="flex items-center justify-between mb-12">
                <span className="font-display font-black text-neon tracking-wider">MENU</span>
                <button onClick={() => setOpen(false)} className="p-2 text-bone hover:text-neon">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {NAV.map((item, i) => {
                  const active = location.pathname === item.to;
                  return (
                    <motion.div
                      key={item.to}
                      initial={{ x: 40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.05 * i }}
                    >
                      <Link
                        to={item.to}
                        className={`block py-4 font-display text-2xl font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${
                          active ? 'text-neon' : 'text-bone/70'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
                {user ? (
                  <>
                    <Link
                      to="/my-uploads"
                      className="mt-8 flex items-center gap-2 py-4 font-display text-lg font-bold uppercase tracking-wider text-neon"
                    >
                      <User className="h-5 w-5" />
                      My Uploads
                    </Link>
                    <Link
                      to="/my-downloads"
                      className="flex items-center gap-2 py-4 font-display text-lg font-bold uppercase tracking-wider text-neon"
                    >
                      <HardDrive className="h-5 w-5" />
                      My Downloads
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2 py-4 font-display text-lg font-bold uppercase tracking-wider text-bone/50"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="mt-8 flex items-center gap-2 py-4 font-display text-lg font-bold uppercase tracking-wider text-neon"
                  >
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </Link>
                )}
                <Link
                  to="/admin"
                  className="mt-4 flex items-center gap-2 py-4 font-display text-lg font-bold uppercase tracking-wider text-flame"
                >
                  <Shield className="h-5 w-5" />
                  Admin Dashboard
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
