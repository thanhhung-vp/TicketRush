import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute.jsx';

// Public
import HomePage        from '../pages/public/HomePage.jsx';
import EventDetailPage from '../pages/public/EventDetailPage.jsx';
import LoginPage       from '../pages/public/LoginPage.jsx';
import RegisterPage    from '../pages/public/RegisterPage.jsx';

// User
import CheckoutPage    from '../pages/user/CheckoutPage.jsx';
import MyTicketsPage   from '../pages/user/MyTicketsPage.jsx';
import TicketsPage     from '../pages/user/TicketsPage.jsx';
import ProfilePage     from '../pages/user/ProfilePage.jsx';
import WaitingRoomPage from '../pages/user/WaitingRoomPage.jsx';

// Admin
import AdminPage       from '../pages/admin/AdminPage.jsx';
import AdminEventPage  from '../pages/admin/AdminEventPage.jsx';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/"               element={<HomePage />} />
      <Route path="/events/:id"     element={<EventDetailPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />

      <Route path="/queue/:eventId" element={<ProtectedRoute><WaitingRoomPage /></ProtectedRoute>} />
      <Route path="/checkout"       element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="/orders/:orderId/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/my-tickets"     element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
      <Route path="/profile"        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      <Route path="/admin"          element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      <Route path="/admin/events/:id" element={<ProtectedRoute adminOnly><AdminEventPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
