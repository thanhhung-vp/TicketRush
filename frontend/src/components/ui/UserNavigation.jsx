import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * UserNavigation — Bell + Avatar cluster for the header.
 *
 * Props:
 *   hasNotification  {boolean}  Show red badge on bell and avatar (default true)
 *
 * Handlers exposed via refs if needed externally:
 *   handleBellClick  — toggles notification panel
 *   handleAvatarClick — toggles profile dropdown
 */
export default function UserNavigation({ hasNotification = true }) {
  const { t }            = useTranslation();
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef  = useRef(null);
  const notifRef = useRef(null);

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Event handlers (attach your own logic here) ── */
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

  /* ── Render ── */
  return (
    <div className="flex items-center gap-2.5">

      {/* ══════════════════════════════
          Bell — notification button
      ══════════════════════════════ */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={handleBellClick}
          aria-label="Thông báo"
          className="
            relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer
            bg-gray-100 dark:bg-gray-800
            hover:bg-gray-200 dark:hover:bg-gray-700
            text-gray-500 dark:text-gray-400
            transition-colors duration-150
          "
        >
          <Bell size={18} strokeWidth={2} />

          {/* Bell badge */}
          {hasNotification && (
            <span className="
              absolute top-1.5 right-1.5
              w-2 h-2 rounded-full bg-red-500
              border-2 border-white dark:border-dark-surface
            " />
          )}
        </button>

        {/* Notification panel — fill with real content when ready */}
        {notifOpen && (
          <div className="
            absolute right-0 top-full mt-2.5 z-50 w-72
            rounded-xl border border-gray-200 dark:border-dark-border
            bg-white dark:bg-dark-surface
            shadow-xl shadow-gray-900/10 dark:shadow-black/30
            overflow-hidden
          ">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Thông báo
              </p>
            </div>
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Không có thông báo mới
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════
          Avatar — profile button
      ══════════════════════════════ */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={handleAvatarClick}
          aria-label="Tài khoản"
          className="relative cursor-pointer group outline-none"
        >
          {/* Avatar circle */}
          <div className="
            w-10 h-10 rounded-full overflow-hidden
            ring-2 ring-white dark:ring-dark-surface
            bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700
            shadow-md
            flex items-center justify-center
            transition-transform duration-150 group-hover:scale-[1.06]
          ">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-6 h-6 text-gray-400 dark:text-gray-500 translate-y-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4
                         7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6
                         4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            )}
          </div>

          {/* ● Red badge — top-right */}
          {hasNotification && (
            <span className="
              absolute -top-0.5 -right-0.5 z-10
              w-[13px] h-[13px] rounded-full bg-red-500
              border-2 border-white dark:border-dark-surface
              shadow-sm
            " />
          )}

          {/* ⌄ Chevron badge — bottom-right */}
          <span className="
            absolute -bottom-1 -right-1 z-10
            w-[18px] h-[18px] rounded-full
            bg-white dark:bg-dark-card
            border border-gray-200 dark:border-dark-border
            shadow-sm
            flex items-center justify-center
          ">
            <ChevronDown
              size={9}
              strokeWidth={3}
              className={`
                text-gray-500 dark:text-gray-300
                transition-transform duration-200
                ${menuOpen ? 'rotate-180' : ''}
              `}
            />
          </span>
        </button>

        {/* ── Profile dropdown ── */}
        {menuOpen && (
          <div className="
            absolute right-0 top-full mt-3 z-50 w-52
            rounded-xl border border-gray-200 dark:border-dark-border
            bg-white dark:bg-dark-surface
            py-1.5
            shadow-xl shadow-gray-900/10 dark:shadow-black/30
            overflow-hidden
          ">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-card transition"
            >
              {t('nav.profile')}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-card transition"
            >
              {t('nav.faq')}
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-amber-600 hover:bg-gray-50 dark:hover:bg-dark-card transition"
              >
                {t('nav.admin')}
              </Link>
            )}
            <div className="border-t border-gray-100 dark:border-dark-border my-1" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-card transition"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
