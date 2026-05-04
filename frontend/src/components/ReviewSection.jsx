import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function StarRating({ value, onChange, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`text-2xl transition-transform ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <span className={hover >= star || value >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function ReviewSection({ eventId }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [data, setData] = useState({ reviews: [], average: null, count: 0 });
  const [myReview, setMyReview] = useState(null);
  const [form, setForm] = useState({ rating: 0, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchReviews = () => {
    api.get(`/reviews/${eventId}`).then(r => setData(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchReviews();
    if (user) {
      api.get(`/reviews/${eventId}/mine`)
        .then(r => {
          setMyReview(r.data);
          if (r.data) setForm({ rating: r.data.rating, comment: r.data.comment || '' });
        })
        .catch(() => {});
    }
  }, [eventId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) return;
    setSubmitting(true);
    try {
      const { data: saved } = await api.post(`/reviews/${eventId}`, form);
      setMyReview(saved);
      setEditing(false);
      fetchReviews();
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm(t('review.confirmDelete'))) return;
    await api.delete(`/reviews/${eventId}`);
    setMyReview(null);
    setForm({ rating: 0, comment: '' });
    fetchReviews();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('review.title')}</h2>
        {data.average && (
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-yellow-500">{data.average}</span>
            <div>
              <StarRating value={Math.round(data.average)} readOnly />
              <p className="text-xs text-gray-400 mt-0.5">{data.count} {t('review.countLabel')}</p>
            </div>
          </div>
        )}
      </div>

      {/* My review form */}
      {user && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          {myReview && !editing ? (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">{t('review.myReview')}</p>
              <StarRating value={myReview.rating} readOnly />
              {myReview.comment && <p className="text-sm text-gray-700 mt-2">{myReview.comment}</p>}
              <div className="flex gap-3 mt-3">
                <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">{t('review.edit')}</button>
                <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">{t('review.delete')}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm font-medium text-gray-700 mb-3">
                {myReview ? t('review.editReview') : t('review.writeReview')}
              </p>
              <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
              <textarea
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                placeholder={t('review.placeholder')}
                rows={3}
                className="mt-3 w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  disabled={!form.rating || submitting}
                  className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {submitting ? t('review.submitting') : t('review.submit')}
                </button>
                {editing && (
                  <button type="button" onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4">
                    {t('review.cancel')}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews list */}
      {data.reviews.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">{t('review.noReviews')}</p>
      ) : (
        <div className="space-y-4">
          {data.reviews.map(r => (
            <div key={r.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {r.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{r.full_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString(locale)}
                  </span>
                </div>
                <StarRating value={r.rating} readOnly />
                {r.comment && <p className="text-sm text-gray-600 mt-1.5">{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
