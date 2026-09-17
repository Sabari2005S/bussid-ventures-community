import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Bus, Shield, LogIn, LogOut, User, HardDrive, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Livery', to: '/livery' },
  { label: 'Convoys', to: '/convoys' },
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
          scrolled ? 'bg-ink-900/95 backdrop-blur-xl border-b border-white/10 shadow-lg' : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="group flex items-center gap-2.5">
              <Bus className="h-7 w-7 text-bone group-hover:text-white transition-colors" />
              <div className="font-display text-sm font-black tracking-wider leading-none">
                <span className="text-bone">BUSSID</span>{' '}
                <span className="text-white">VENTURES</span>
                <div className="text-[9px] tracking-[0.4em] text-bone/50 font-mono">COMMUNITY</div>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
              {NAV.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="relative px-2.5 xl:px-3.5 py-1.5 font-display text-xs xl:text-sm font-bold uppercase tracking-wider transition-colors duration-200"
                  >
                    <span className={active ? 'text-white font-bold' : 'text-bone/70 hover:text-white'}>{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-white/80"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)' }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <NotificationBell />
              <button
                onClick={() => setSearchOpen((s) => !s)}
                className="p-1.5 sm:p-2 text-bone/70 hover:text-white transition-colors shrink-0"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              {user ? (
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Link
                    to="/my-uploads"
                    className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-neon border border-neon/30 hover:bg-neon/10 transition-all rounded"
                    title={user.email ?? 'Account'}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="max-w-[75px] sm:max-w-[110px] xl:max-w-[140px] truncate">
                      {user.email?.split('@')[0] ?? 'Account'}
                    </span>
                  </Link>
                  <Link
                    to="/my-downloads"
                    className="hidden sm:flex p-1.5 sm:p-2 text-bone/70 hover:text-neon transition-colors"
                    aria-label="My Downloads"
                    title="My Downloads"
                  >
                    <HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="hidden sm:flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:text-red-300 transition-all shrink-0 rounded"
                    aria-label="Sign out"
                    title="Log Out"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-display font-bold uppercase tracking-wider text-neon border border-neon/30 hover:bg-neon/10 transition-all rounded shrink-0"
                >
                  <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Sign In</span>
                </Link>
              )}
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-display font-bold uppercase tracking-wider text-flame border border-flame/30 hover:bg-flame/10 transition-all rounded shrink-0"
              >
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Admin</span>
              </Link>
              <button
                onClick={() => setOpen(true)}
                className="lg:hidden p-2 text-bone hover:text-neon transition-colors shrink-0 focus:outline-none"
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
              className="absolute right-0 top-0 h-full w-full max-w-sm glass-strong p-6 overflow-y-auto overscroll-contain flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="font-display font-black text-neon tracking-wider">NAVIGATION</span>
                  <button onClick={() => setOpen(false)} className="p-2 text-bone hover:text-neon">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* User card when signed in on mobile */}
                {user ? (
                  <div className="p-3 mb-6 glass border border-neon/30 rounded flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-neon/10 border border-neon/40 text-neon font-display font-bold text-sm flex items-center justify-center shrink-0 uppercase">
                        {user.email?.slice(0, 2) ?? 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-display font-bold text-bone truncate">{user.email?.split('@')[0]}</div>
                        <div className="text-[10px] font-mono text-neon/80 truncate">{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setOpen(false); signOut(); }}
                      className="p-1.5 text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 rounded flex items-center gap-1 text-[10px] font-mono uppercase"
                      title="Sign Out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Exit
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="mb-6 flex items-center justify-center gap-2 py-3 px-4 font-display text-sm font-bold uppercase tracking-wider text-ink-900 bg-neon hover:bg-neon-bright transition-all rounded shadow-neon-sm"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In / Register
                  </Link>
                )}

                <div className="flex flex-col gap-1">
                  {NAV.map((item, i) => {
                    const active = location.pathname === item.to;
                    return (
                      <motion.div
                        key={item.to}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.03 * i }}
                      >
                        <Link
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={`block py-3 font-display text-xl font-bold uppercase tracking-wider border-b border-white/5 transition-colors ${
                            active ? 'text-neon pl-2 border-l-2 border-l-neon' : 'text-bone/70 hover:text-bone'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </motion.div>
                    );
                  })}

                  <Link
                    to="/requests"
                    onClick={() => setOpen(false)}
                    className="block py-3 font-display text-xl font-bold uppercase tracking-wider border-b border-white/5 text-bone/70 hover:text-bone"
                  >
                    Livery Requests
                  </Link>

                  <Link
                    to="/upload-livery"
                    onClick={() => setOpen(false)}
                    className="block py-3 font-display text-xl font-bold uppercase tracking-wider border-b border-white/5 text-bone/70 hover:text-bone"
                  >
                    Upload Livery
                  </Link>

                  {user && (
                    <>
                      <Link
                        to="/my-uploads"
                        onClick={() => setOpen(false)}
                        className="mt-4 flex items-center gap-2.5 py-3 font-display text-base font-bold uppercase tracking-wider text-neon hover:text-neon-bright"
                      >
                        <User className="h-4 w-4" />
                        My Uploads
                      </Link>
                      <Link
                        to="/my-downloads"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 py-3 font-display text-base font-bold uppercase tracking-wider text-neon hover:text-neon-bright"
                      >
                        <HardDrive className="h-4 w-4" />
                        My Downloads
                      </Link>
                    </>
                  )}

                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="mt-2 flex items-center gap-2.5 py-3 font-display text-base font-bold uppercase tracking-wider text-flame hover:text-flame"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Portal
                  </Link>

                  <button
                    onClick={() => {
                      setOpen(false);
                      window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
                    }}
                    className="mt-4 mb-6 flex items-center gap-2.5 py-3 font-display text-base font-bold uppercase tracking-wider text-neon border-t border-white/10 w-full text-left"
                  >
                    <Smartphone className="h-4 w-4" />
                    Install App (Android)
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
