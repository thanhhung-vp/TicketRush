import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.context.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);
  const menuRef          = useRef(null);

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
    <nav className="sticky top-0 z-50 bg-surface-elevated-translucent backdrop-blur-xl border-b border-separator
                    px-4 sm:px-6 py-3 flex items-center justify-between
                    transition-colors duration-fast">
      {/* Brand */}
      <Link
        to="/"
        className="text-title-3 font-bold text-label-primary flex items-center gap-2 hover:text-accent transition-colors duration-fast"
      >
        <span className="text-2xl">🎫</span>
        <span>TicketRush</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3 text-subhead">
        {user ? (
          <>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:block text-warning hover:opacity-80 font-medium transition-opacity duration-fast"
              >
                Admin
              </Link>
            )}

            <Link
              to="/my-tickets"
              className="hidden sm:block text-label-secondary hover:text-label-primary transition-colors duration-fast"
            >
              Vé của tôi
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 bg-fill-tertiary hover:bg-fill-quaternary border border-separator rounded-xl px-3 py-1.5 transition-colors duration-fast"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <span className="w-6 h-6 rounded-full bg-fill-quaternary flex items-center justify-center text-caption-1 font-bold text-label-primary flex-shrink-0">
                  {initials}
                </span>
                <span className="hidden sm:block text-label-primary max-w-[100px] truncate">
                  {user.full_name}
                </span>
                <span className="text-label-tertiary text-caption-2">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 bg-surface border border-separator rounded-xl shadow-popover overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-separator">
                    <p className="font-semibold text-subhead text-label-primary truncate">{user.full_name}</p>
                    <p className="text-footnote text-label-tertiary truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
                  >
                    Tài khoản
                  </Link>

                  <Link
                    to="/my-tickets"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast sm:hidden"
                  >
                    Vé của tôi
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-subhead text-warning hover:bg-fill-quaternary transition-colors duration-fast sm:hidden"
                    >
                      Admin
                    </Link>
                  )}

                  <div className="border-t border-separator" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 text-subhead text-danger hover:bg-fill-quaternary transition-colors duration-fast"
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
              className="text-label-secondary hover:text-label-primary transition-colors duration-fast"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg font-medium transition-colors duration-fast"
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
