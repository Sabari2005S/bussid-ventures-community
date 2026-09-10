import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { LiveryPage } from '@/pages/LiveryPage';
import { LiveryDetailPage } from '@/pages/LiveryDetailPage';
import { TournamentPage } from '@/pages/TournamentPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminLiveriesPage } from '@/pages/admin/AdminLiveriesPage';
import { AdminAddLiveryPage } from '@/pages/admin/AdminAddLiveryPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminDownloadsPage } from '@/pages/admin/AdminDownloadsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminTournamentsPage } from '@/pages/admin/AdminTournamentsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';
import { AdminModerationPage } from '@/pages/admin/AdminModerationPage';
import { CommunityUploadPage } from '@/pages/CommunityUploadPage';
import { MyUploadsPage } from '@/pages/MyUploadsPage';
import { MyDownloadsPage } from '@/pages/MyDownloadsPage';
import { UserLoginPage } from '@/pages/UserLoginPage';
import { Clock, Shield } from 'lucide-react';

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
  return (
    <div className="min-h-screen grid place-items-center bg-ink-900 px-4">
      <div className="hud-panel p-8 max-w-md text-center">
        <div className="inline-flex p-3 border border-flame/30 text-flame mb-4">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-black text-bone mb-3">Awaiting Approval</h1>
        <p className="text-bone/50 font-body mb-6">
          Your account has been created. The founder admin needs to approve your access before you can
          enter the dashboard. Please check back later.
        </p>
        <a href="/admin" className="btn-ghost inline-block">Back to Login</a>
      </div>
    </div>
  );
}

function AccessDeniedScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-ink-900 px-4">
      <div className="hud-panel p-8 max-w-md text-center">
        <div className="inline-flex p-3 border border-flame/30 text-flame mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-black text-bone mb-3">Access Denied</h1>
        <p className="text-bone/50 font-body mb-6">
          You are signed in as a community user. Administrative privileges (Admin or Founder) are required to access this portal.
        </p>
        <a href="/" className="btn-neon inline-block">Return to Home</a>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
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
  const { session, loading, adminProfile } = useAuth();
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
  const isApprovedAdmin = adminProfile?.approved === true && (adminProfile?.role === 'admin' || adminProfile?.role === 'founder');

  if (!isApprovedAdmin) {
    if (adminProfile?.role === 'pending' || !adminProfile?.approved) {
      return <PendingAdminScreen />;
    }
    return <AccessDeniedScreen />;
  }

  return (
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AnimatedRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
