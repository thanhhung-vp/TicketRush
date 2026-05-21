import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollRestoration from './components/ScrollRestoration.jsx';
import { useSmoothWheelScroll } from './hooks/useSmoothWheelScroll.js';
import { prefetchAdminPageData } from './services/adminPageCache.js';
import { scheduleIdleTask } from './utils/idleTask.js';
import { preloadAppRoute, routeLoaders } from './utils/routePreload.js';

const HomePage = lazy(routeLoaders.home);
const SearchPage = lazy(routeLoaders.search);
const NewsDetailPage = lazy(routeLoaders.newsDetail);
const EventDetailPage = lazy(routeLoaders.eventDetail);
const LoginPage = lazy(routeLoaders.login);
const RegisterPage = lazy(routeLoaders.register);
const GoogleAuthCallbackPage = lazy(routeLoaders.googleCallback);
const FacebookAuthCallbackPage = lazy(routeLoaders.facebookCallback);
const ForgotPasswordPage = lazy(routeLoaders.forgotPassword);
const WaitingRoomPage = lazy(routeLoaders.waitingRoom);
const CheckoutPage = lazy(routeLoaders.checkout);
const TicketsPage = lazy(routeLoaders.tickets);
const MyTicketsPage = lazy(routeLoaders.myTickets);
const ProfilePage = lazy(routeLoaders.profile);
const FAQPage = lazy(routeLoaders.faq);
const TermsPage = lazy(routeLoaders.terms);
const AboutPage = lazy(routeLoaders.about);
const FeedbackPage = lazy(routeLoaders.feedback);
const AdminPage = lazy(routeLoaders.admin);
const AdminEventPage = lazy(routeLoaders.adminEvent);
const AdminCheckinPage = lazy(routeLoaders.adminCheckin);

function PageLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-16 text-sm text-label-secondary">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </div>
  );
}

function RouteIntentPreloader() {
  useEffect(() => {
    const preloadFromAnchor = (event) => {
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      preloadAppRoute(url.pathname);
    };

    document.addEventListener('pointerover', preloadFromAnchor, { passive: true });
    document.addEventListener('focusin', preloadFromAnchor);
    document.addEventListener('touchstart', preloadFromAnchor, { passive: true });

    return () => {
      document.removeEventListener('pointerover', preloadFromAnchor);
      document.removeEventListener('focusin', preloadFromAnchor);
      document.removeEventListener('touchstart', preloadFromAnchor);
    };
  }, []);

  return null;
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  useSmoothWheelScroll();

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;

    return scheduleIdleTask(() => {
      preloadAppRoute('/admin');
      prefetchAdminPageData();
    }, 1200);
  }, [user?.role]);

  return (
    <>
      <ScrollRestoration />
      <RouteIntentPreloader />
      <Navbar />
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/"                  element={<HomePage />} />
            <Route path="/search"            element={<SearchPage />} />
            <Route path="/news/:id"          element={<NewsDetailPage />} />
            <Route path="/events/:id"        element={<EventDetailPage />} />
            <Route path="/login"             element={<LoginPage />} />
            <Route path="/register"          element={<RegisterPage />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
            <Route path="/auth/facebook/callback" element={<FacebookAuthCallbackPage />} />
            <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
            <Route path="/queue/:eventId"    element={<PrivateRoute><WaitingRoomPage /></PrivateRoute>} />
            <Route path="/checkout"          element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
            <Route path="/orders/:orderId/tickets" element={<PrivateRoute><TicketsPage /></PrivateRoute>} />
            <Route path="/my-tickets"        element={<PrivateRoute><MyTicketsPage /></PrivateRoute>} />
            <Route path="/profile"           element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/faq"               element={<FAQPage />} />
            <Route path="/terms"             element={<TermsPage />} />
            <Route path="/about"             element={<AboutPage />} />
            <Route path="/support"           element={<FeedbackPage />} />
            <Route path="/feedback"          element={<FeedbackPage />} />
            <Route path="/admin"             element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
            <Route path="/admin/events/:id"  element={<PrivateRoute adminOnly><AdminEventPage /></PrivateRoute>} />
            <Route path="/admin/events/:eventId/checkin" element={<PrivateRoute adminOnly><AdminCheckinPage /></PrivateRoute>} />
            <Route path="*"                  element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
