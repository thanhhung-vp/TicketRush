import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, ChevronDown } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../lib/api.js';
import { prefetchAdminPageData } from '../../services/adminPageCache.js';
import { preloadAppRoute } from '../../utils/routePreload.js';

function warmAdminRoute() {
  preloadAppRoute('/admin');
  prefetchAdminPageData();
}

export default function UserNavigation() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unread_count || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    loadNotifications();
    const socket = io('/', {
      auth: { token: localStorage.getItem('accessToken') || localStorage.getItem('token') },
    });
    socket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
    });

    const interval = setInterval(loadNotifications, 60_000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [loadNotifications, user?.id]);

  const handleBellClick = () => {
    setNotifOpen(open => {
      if (!open) loadNotifications();
      return !open;
    });
    setMenuOpen(false);
  };

  const handleAvatarClick = () => {
    if (user?.role === 'admin') warmAdminRoute();
    setMenuOpen(open => !open);
    setNotifOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications(prev => prev.map(item => ({
      ...item,
      read_at: item.read_at || new Date().toISOString(),
    })));
    setUnreadCount(0);
  };

  const handleOpenNotification = (notification) => {
    if (!notification.read_at) {
      api.patch(`/notifications/${notification.id}/read`).catch(() => {});
      setNotifications(prev => prev.map(item => (
        item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
      )));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setNotifOpen(false);
    if (notification.action_url) navigate(notification.action_url);
  };

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative" ref={notifRef}>
        <button
          onClick={handleBellClick}
          aria-label="Thong bao"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-fill-tertiary text-label-secondary transition-colors duration-fast ease-standard hover:bg-fill-quaternary"
        >
          <Bell size={18} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full z-50 mt-2.5 w-80 overflow-hidden rounded-xl border border-separator bg-surface shadow-popover">
            <div className="flex items-center justify-between gap-3 border-b border-separator px-4 py-3">
              <p className="text-subhead font-semibold text-label-primary">Thong bao</p>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent disabled:text-label-tertiary"
              >
                <CheckCheck size={14} />
                Đã đọc tất cả
              </button>
            </div>

            {notifLoading ? (
              <div className="px-4 py-8 text-center text-footnote text-label-tertiary">
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-footnote text-label-tertiary">
                Không có thông báo mới
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto py-1">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className="block w-full px-4 py-3 text-left transition-colors duration-fast hover:bg-fill-quaternary"
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read_at && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-danger" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-label-primary">
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="mt-1 line-clamp-2 text-xs text-label-secondary">
                            {notification.body}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-label-tertiary">
                          {new Date(notification.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={handleAvatarClick}
          aria-label="Tai khoan"
          className="group relative cursor-pointer outline-none"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-fill-tertiary shadow-1 ring-2 ring-surface transition-transform duration-fast ease-standard group-hover:scale-[1.06]">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <svg className="h-6 w-6 translate-y-0.5 text-label-tertiary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
          </div>

          <span className="absolute -bottom-1 -right-1 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-separator bg-surface shadow-1">
            <ChevronDown
              size={9}
              strokeWidth={3}
              className={`text-label-secondary transition-transform duration-fast ${menuOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-3 w-52 overflow-hidden rounded-xl border border-separator bg-surface py-1.5 shadow-popover">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-subhead text-label-primary transition-colors duration-fast hover:bg-fill-quaternary"
            >
              {t('nav.profile')}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-subhead text-label-primary transition-colors duration-fast hover:bg-fill-quaternary"
            >
              {t('nav.faq')}
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                onPointerEnter={warmAdminRoute}
                onFocus={warmAdminRoute}
                onTouchStart={warmAdminRoute}
                className="block px-4 py-2.5 text-subhead text-warning transition-colors duration-fast hover:bg-fill-quaternary"
              >
                {t('nav.admin')}
              </Link>
            )}
            <div className="my-1 border-t border-separator" />
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2.5 text-left text-subhead text-danger transition-colors duration-fast hover:bg-fill-quaternary"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
