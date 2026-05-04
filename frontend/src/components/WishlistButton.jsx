import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function WishlistButton({ eventId, className = '' }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !eventId) return;
    api.get(`/wishlists/check/${eventId}`)
      .then(r => setSaved(r.data.saved))
      .catch(() => {});
  }, [user, eventId]);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { window.location.href = '/login'; return; }
    setLoading(true);
    try {
      if (saved) {
        await api.delete(`/wishlists/${eventId}`);
        setSaved(false);
      } else {
        await api.post(`/wishlists/${eventId}`);
        setSaved(true);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? t('wishlist.unsave') : t('wishlist.save')}
      className={`flex items-center justify-center rounded-full transition-all ${className} ${
        saved
          ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
          : 'bg-white/80 text-gray-400 hover:bg-pink-50 hover:text-pink-500'
      }`}
    >
      <svg
        className={`w-5 h-5 transition-transform ${loading ? 'scale-90' : 'scale-100'}`}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
