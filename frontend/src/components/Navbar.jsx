import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout }   = useAuth();
  const navigate           = useNavigate();
  const [open, setOpen]    = useState(false);
  const menuRef            = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Logo */}
      <Link to="/" className="text-xl font-extrabold flex items-center gap-1 shrink-0">
        <span className="text-primary">Ticket</span>
        <span className="text-gray-800">Rush</span>
      </Link>

      {/* Search bar — center */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            placeholder="Tìm sự kiện, nghệ sĩ..."
            className="w-full bg-gray-50 border border-gray-300 rounded-full pl-10 pr-4 py-2 text-sm
                       focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                       placeholder-gray-400 transition"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                navigate(`/?search=${encodeURIComponent(e.target.value.trim())}`);
              }
            }}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 text-sm shrink-0">
        {user ? (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" className="text-amber-600 hover:text-amber-700 font-medium transition hidden sm:block">
                ⚙ Admin
              </Link>
            )}
            <Link to="/my-tickets" className="text-gray-600 hover:text-gray-900 transition hidden sm:block">
              🎟 Vé của tôi
            </Link>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full px-3 py-1.5 transition">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="hidden sm:block text-gray-700 max-w-[100px] truncate text-sm">{user.full_name}</span>
                <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                  <Link to="/profile" onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                    👤 Tài khoản
                  </Link>
                  <Link to="/my-tickets" onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition sm:hidden">
                    🎟 Vé của tôi
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-amber-600 hover:bg-gray-50 transition sm:hidden">
                      ⚙ Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-100" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-gray-50 transition w-full text-left">
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 transition font-medium">Đăng nhập</Link>
            <Link to="/register" className="text-gray-600 hover:text-gray-900 transition font-medium">Đăng ký</Link>
          </>
        )}
      </div>
    </nav>
  );
}
