import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.context.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);
  const menuRef          = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <Link
        to="/"
        className="text-xl font-bold text-white flex items-center gap-2 hover:text-blue-400 transition"
      >
        <span className="text-2xl">🎫</span>
        <span>TicketRush</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            {/* Admin link — desktop */}
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:block text-yellow-400 hover:text-yellow-300 font-medium transition"
              >
                Admin
              </Link>
            )}

            {/* My tickets — desktop */}
            <Link
              to="/my-tickets"
              className="hidden sm:block text-gray-300 hover:text-white transition"
            >
              Vé của tôi
            </Link>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 py-1.5 transition"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {initials}
                </span>
                <span className="hidden sm:block text-gray-300 max-w-[100px] truncate">
                  {user.full_name}
                </span>
                <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                  {/* User info row */}
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="font-semibold text-sm truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                  >
                    Tài khoản
                  </Link>

                  <Link
                    to="/my-tickets"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition sm:hidden"
                  >
                    Vé của tôi
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:bg-gray-800 hover:text-yellow-300 transition sm:hidden"
                    >
                      Admin
                    </Link>
                  )}

                  <div className="border-t border-gray-800" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-gray-300 hover:text-white transition"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition"
            >
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
