import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

/** UserNavigation — Bell + Avatar cluster for the header. */
export default function UserNavigation({ hasNotification = true }) {
  const { t }            = useTranslation();
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef  = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    setNotifOpen(v => !v);
    setMenuOpen(false);
  };

  const handleAvatarClick = () => {
    setMenuOpen(v => !v);
    setNotifOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-2.5">

      {/* Bell */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={handleBellClick}
          aria-label="Thông báo"
          className="relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer
                     bg-fill-tertiary hover:bg-fill-quaternary
                     text-label-secondary
                     transition-colors duration-fast ease-standard"
        >
          <Bell size={18} strokeWidth={2} />
          {hasNotification && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger
                             border-2 border-surface" />
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2.5 z-50 w-72
                          rounded-xl border border-separator bg-surface
                          shadow-popover overflow-hidden">
            <div className="px-4 py-3 border-b border-separator">
              <p className="text-subhead font-semibold text-label-primary">Thông báo</p>
            </div>
            <div className="px-4 py-8 text-center text-footnote text-label-tertiary">
              Không có thông báo mới
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={handleAvatarClick}
          aria-label="Tài khoản"
          className="relative cursor-pointer group outline-none"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden
                          ring-2 ring-surface
                          bg-fill-tertiary
                          shadow-1
                          flex items-center justify-center
                          transition-transform duration-fast ease-standard group-hover:scale-[1.06]">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-label-tertiary translate-y-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4
                         7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6
                         4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            )}
          </div>

          {hasNotification && (
            <span className="absolute -top-0.5 -right-0.5 z-10
                             w-[13px] h-[13px] rounded-full bg-danger
                             border-2 border-surface
                             shadow-1" />
          )}

          <span className="absolute -bottom-1 -right-1 z-10
                           w-[18px] h-[18px] rounded-full
                           bg-surface
                           border border-separator
                           shadow-1
                           flex items-center justify-center">
            <ChevronDown
              size={9}
              strokeWidth={3}
              className={`text-label-secondary transition-transform duration-fast ${menuOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-3 z-50 w-52
                          rounded-xl border border-separator bg-surface py-1.5
                          shadow-popover overflow-hidden">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
            >
              {t('nav.profile')}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-subhead text-label-primary hover:bg-fill-quaternary transition-colors duration-fast"
            >
              {t('nav.faq')}
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-subhead text-warning hover:bg-fill-quaternary transition-colors duration-fast"
              >
                {t('nav.admin')}
              </Link>
            )}
            <div className="border-t border-separator my-1" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 text-subhead text-danger hover:bg-fill-quaternary transition-colors duration-fast"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
