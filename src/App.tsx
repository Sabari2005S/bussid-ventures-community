import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth, isFounderEmail } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { isSupabaseConfigured, supabaseConfigDiagnostic } from '@/lib/supabase';
import { Clock, Shield, AlertTriangle } from 'lucide-react';

// Lazy-loaded routes for code splitting and instant initial bundle loading
const LiveryPage = lazy(() => import('@/pages/LiveryPage').then((m) => ({ default: m.LiveryPage })));
const LiveryDetailPage = lazy(() => import('@/pages/LiveryDetailPage').then((m) => ({ default: m.LiveryDetailPage })));
const TournamentPage = lazy(() => import('@/pages/TournamentPage').then((m) => ({ default: m.TournamentPage })));
const GroupsPage = lazy(() => import('@/pages/GroupsPage').then((m) => ({ default: m.GroupsPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const CommunityUploadPage = lazy(() => import('@/pages/CommunityUploadPage').then((m) => ({ default: m.CommunityUploadPage })));
const MyUploadsPage = lazy(() => import('@/pages/MyUploadsPage').then((m) => ({ default: m.MyUploadsPage })));
const MyDownloadsPage = lazy(() => import('@/pages/MyDownloadsPage').then((m) => ({ default: m.MyDownloadsPage })));
const UserLoginPage = lazy(() => import('@/pages/UserLoginPage').then((m) => ({ default: m.UserLoginPage })));

// Admin lazy-loaded routes
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminLiveriesPage = lazy(() => import('@/pages/admin/AdminLiveriesPage').then((m) => ({ default: m.AdminLiveriesPage })));
const AdminAddLiveryPage = lazy(() => import('@/pages/admin/AdminAddLiveryPage').then((m) => ({ default: m.AdminAddLiveryPage })));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminDownloadsPage = lazy(() => import('@/pages/admin/AdminDownloadsPage').then((m) => ({ default: m.AdminDownloadsPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminTournamentsPage = lazy(() => import('@/pages/admin/AdminTournamentsPage').then((m) => ({ default: m.AdminTournamentsPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminModerationPage = lazy(() => import('@/pages/admin/AdminModerationPage').then((m) => ({ default: m.AdminModerationPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function PendingAdminScreen() {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen grid place-items-center bg-ink-900 px-4">
      <div className="hud-panel p-8 max-w-md text-center">
        <div className="inline-flex p-3 border border-flame/30 text-flame mb-4">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-black text-bone mb-3">Awaiting Approval</h1>
        {user?.email && (
          <p className="text-bone/60 font-mono text-xs mb-3 bg-black/20 py-1 px-2 border border-white/5 inline-block">
            {user.email}
          </p>
        )}
        <p className="text-bone/50 font-body mb-6 text-sm leading-relaxed">
          Your account has been registered. An approved administrator or founder must approve your access before you can enter the dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => signOut()} className="btn-ghost text-xs px-4 py-2">
            Sign Out
          </button>
          <a href="/" className="btn-neon text-xs px-4 py-2">
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}

function AccessDeniedScreen() {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen grid place-items-center bg-ink-900 px-4">
      <div className="hud-panel p-8 max-w-md text-center">
        <div className="inline-flex p-3 border border-flame/30 text-flame mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-black text-bone mb-3">Access Denied</h1>
        {user?.email && (
          <p className="text-bone/60 font-mono text-xs mb-3 bg-black/20 py-1 px-2 border border-white/5 inline-block">
            {user.email}
          </p>
        )}
        <p className="text-bone/50 font-body mb-6 text-sm leading-relaxed">
          You are signed in with a community user account. Administrative privileges are required to access this portal.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => signOut()} className="btn-ghost text-xs px-4 py-2">
            Sign Out
          </button>
          <a href="/" className="btn-neon text-xs px-4 py-2">
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="h-8 w-8 border-2 border-neon border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoading />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><PublicLayout><HomePage /></PublicLayout></PageTransition>} />
          <Route path="/livery" element={<PageTransition><PublicLayout><LiveryPage /></PublicLayout></PageTransition>} />
          <Route path="/livery/:id" element={<PageTransition><PublicLayout><LiveryDetailPage /></PublicLayout></PageTransition>} />
          <Route path="/tournament" element={<PageTransition><PublicLayout><TournamentPage /></PublicLayout></PageTransition>} />
          <Route path="/groups" element={<PageTransition><PublicLayout><GroupsPage /></PublicLayout></PageTransition>} />
          <Route path="/about" element={<PageTransition><PublicLayout><AboutPage /></PublicLayout></PageTransition>} />
          <Route path="/contact" element={<PageTransition><PublicLayout><ContactPage /></PublicLayout></PageTransition>} />
          <Route path="/upload-livery" element={<PageTransition><PublicLayout><CommunityUploadPage /></PublicLayout></PageTransition>} />
          <Route path="/my-uploads" element={<PageTransition><PublicLayout><MyUploadsPage /></PublicLayout></PageTransition>} />
          <Route path="/my-downloads" element={<PageTransition><PublicLayout><MyDownloadsPage /></PublicLayout></PageTransition>} />
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<ProtectedAdminRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function ProtectedAdminRoutes() {
  const { session, loading, adminProfile, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-900">
        <div className="h-8 w-8 border-2 border-neon border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }

  // Strictly enforce: ONLY admins who have been given approval by founder can access admin dashboard
  // Designated founder always has guaranteed instant access
  const isDesignatedFounder = isFounderEmail(user?.email);
  const isApprovedAdmin =
    isDesignatedFounder ||
    (adminProfile?.approved === true && (adminProfile?.role === 'admin' || adminProfile?.role === 'founder'));

  if (!isApprovedAdmin) {
    if (!adminProfile || adminProfile.role === 'pending' || !adminProfile.approved) {
      return <PendingAdminScreen />;
    }
    return <AccessDeniedScreen />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-ink-900">
          <div className="h-8 w-8 border-2 border-neon border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="liveries" element={<AdminLiveriesPage />} />
          <Route path="add-livery" element={<AdminAddLiveryPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="downloads" element={<AdminDownloadsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="tournaments" element={<AdminTournamentsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="moderation" element={<AdminModerationPage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-amber-500 text-black px-4 py-2.5 text-center text-xs font-mono font-bold sticky top-0 z-[100] shadow-lg flex flex-col sm:flex-row items-center justify-center gap-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Database Not Connected:</span>
      </div>
      <span>
        URL: <code className="bg-black/15 px-1 py-0.5 rounded">{supabaseConfigDiagnostic.urlPreview}</code> | Key:{' '}
        <code className="bg-black/15 px-1 py-0.5 rounded">
          {supabaseConfigDiagnostic.keyDetected ? `Detected (${supabaseConfigDiagnostic.keyLength} chars)` : 'NOT SET'}
        </code>
      </span>
      <span className="opacity-80">
        ➔ In Render Static Site: Environment ➔ Save ➔ Click "Clear build cache & deploy".
      </span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SupabaseConfigBanner />
        <BrowserRouter>
          <ScrollToTop />
          <AnimatedRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
