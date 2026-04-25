import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold flex items-center gap-2">
        🎫 <span>TicketRush</span>
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" className="text-yellow-400 hover:text-yellow-300 font-medium">
                Admin
              </Link>
            )}
            <Link to="/my-tickets" className="text-gray-300 hover:text-white">Vé của tôi</Link>
            <span className="text-gray-500">|</span>
            <span className="text-gray-300">{user.full_name}</span>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300">Đăng xuất</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-300 hover:text-white">Đăng nhập</Link>
            <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition">
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
