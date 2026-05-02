import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.context.jsx';
import { PageSpinner } from '../ui/Spinner.jsx';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
