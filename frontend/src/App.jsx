import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

import LoginPage          from './pages/LoginPage.jsx';
import RegisterPage       from './pages/RegisterPage.jsx';
import HomePage           from './pages/HomePage.jsx';
import EventDetailPage    from './pages/EventDetailPage.jsx';
import CheckoutPage       from './pages/CheckoutPage.jsx';
import TicketsPage        from './pages/TicketsPage.jsx';
import MyTicketsPage      from './pages/MyTicketsPage.jsx';
import AdminPage          from './pages/AdminPage.jsx';
import AdminEventPage     from './pages/AdminEventPage.jsx';
import WaitingRoomPage    from './pages/WaitingRoomPage.jsx';
import ProfilePage        from './pages/ProfilePage.jsx';
import FAQPage            from './pages/FAQPage.jsx';
import AdminCheckinPage   from './pages/AdminCheckinPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import TermsPage          from './pages/TermsPage.jsx';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-100 text-gray-900">
        <Routes>
          <Route path="/"                  element={<HomePage />} />
          <Route path="/events/:id"        element={<EventDetailPage />} />
          <Route path="/login"             element={<LoginPage />} />
          <Route path="/register"          element={<RegisterPage />} />
          <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
          <Route path="/queue/:eventId"    element={<PrivateRoute><WaitingRoomPage /></PrivateRoute>} />
          <Route path="/checkout"          element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/orders/:orderId/tickets" element={<PrivateRoute><TicketsPage /></PrivateRoute>} />
          <Route path="/my-tickets"        element={<PrivateRoute><MyTicketsPage /></PrivateRoute>} />
          <Route path="/profile"           element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/faq"               element={<FAQPage />} />
          <Route path="/terms"             element={<TermsPage />} />
          <Route path="/admin"             element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
          <Route path="/admin/events/:id"  element={<PrivateRoute adminOnly><AdminEventPage /></PrivateRoute>} />
          <Route path="/admin/events/:eventId/checkin" element={<PrivateRoute adminOnly><AdminCheckinPage /></PrivateRoute>} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
