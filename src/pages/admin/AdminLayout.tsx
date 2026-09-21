import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Image,
  PlusCircle,
  Tags,
  Download,
  Users,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  Bus,
  Bell,
  BarChart3,
  Shield,
  Radio,
} from 'lucide-react';
import { useAuth, isFounderEmail } from '@/context/AuthContext';
import { Crown } from 'lucide-react';
import { getAdminNotificationCounts, type AdminNotificationCounts } from '@/lib/supabase';

const SIDEBAR = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Liveries', to: '/admin/liveries', icon: Image },
  { label: 'Add Livery', to: '/admin/add-livery', icon: PlusCircle },
  { label: 'Categories', to: '/admin/categories', icon: Tags },
  { label: 'Downloads', to: '/admin/downloads', icon: Download },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Convoys', to: '/admin/convoys', icon: Radio },
  { label: 'Tournaments', to: '/admin/tournaments', icon: Trophy },
  { label: 'Moderation', to: '/admin/moderation', icon: Shield },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Notifications', to: '/admin/notifications', icon: Bell },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  const { signOut, user, adminProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCounts, setNotifCounts] = useState<AdminNotificationCounts>({
    pendingAdmins: 0,
    pendingLiveries: 0,
    openLiveryRequests: 0,
    reportsCount: 0,
    total: 0,
  });

  const isFounder = adminProfile?.role === 'founder' || isFounderEmail(user?.email);

  useEffect(() => {
    let mounted = true;
    async function fetchCounts() {
      const counts = await getAdminNotificationCounts();
      if (mounted) {
        setNotifCounts(counts);
      }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Only the founder has the power to manage users & admins
  const navigationItems = SIDEBAR.filter((item) => {
    if (item.to === '/admin/users') {
      return isFounder;
    }
    return true;
  });

  async function handleLogout() {
    await signOut();
    navigate('/admin');
  }

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <Link to="/admin/dashboard" className="flex items-center gap-2.5 px-6 h-16 border-b border-white/5">
        <Bus className="h-6 w-6 text-neon" />
        <div className="font-display text-xs font-black tracking-wider">
          <span className="text-bone">BUSSID</span> <span className="text-neon">ADMIN</span>
        </div>
      </Link>
      {isFounder && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-flame/5">
          <Crown className="h-3.5 w-3.5 text-flame" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-flame">Founder Access</span>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigationItems.map(({ label, to, icon: Icon }) => {
          const active = location.pathname === to;
          const showBadge = label === 'Notifications' && notifCounts.total > 0;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-4 py-3 font-display text-sm font-bold uppercase tracking-wider transition-all ${
                active
                  ? 'bg-neon/10 text-neon border-l-2 border-neon'
                  : 'text-bone/50 hover:text-bone hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              {showBadge && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-flame/20 text-flame border border-flame/40 rounded-full animate-pulse">
                  {notifCounts.total > 99 ? '99+' : notifCounts.total}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-7 py-4 text-flame font-display text-sm font-bold uppercase tracking-wider border-t border-white/5 hover:bg-flame/10 transition-all"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-white/5 glass-strong fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50"
          >
            <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="absolute left-0 top-0 h-full w-64 glass-strong"
            >
              <SidebarContent />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 h-16 glass-strong border-b border-white/5 flex items-center justify-between px-4 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-bone">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neon animate-pulse-glow" />
            <span className="font-mono text-xs uppercase tracking-widest text-bone/50 hidden sm:inline">System Online</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/notifications"
              className="relative p-2 text-bone/60 hover:text-bone hover:bg-white/5 rounded transition-colors"
              title="Admin Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifCounts.total > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-flame animate-pulse" />
              )}
            </Link>
            <span className="font-mono text-xs text-bone/40 hidden sm:inline">{user?.email}</span>
            <Link to="/" className="font-display text-xs uppercase tracking-wider text-bone/50 hover:text-neon">
              View Site →
            </Link>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
