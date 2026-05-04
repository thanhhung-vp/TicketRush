import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';

export default function AdminCheckinPage() {
  const { eventId } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [qr, setQr]         = useState('');
  const [result, setResult]  = useState(null);
  const [stats, setStats]    = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const fetchStats = () => {
    api.get(`/checkin/stats/${eventId}`).then(r => setStats(r.data)).catch(() => {});
    api.get(`/checkin/list/${eventId}`).then(r => setHistory(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchStats();
    inputRef.current?.focus();
  }, [eventId]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!qr.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/checkin', { qr_code: qr.trim() });
      setResult({ ok: true, ...data });
      fetchStats();
    } catch (err) {
      const data = err.response?.data;
      setResult({ ok: false, error: data?.error || t('checkin.unknownError'), ticket: data?.ticket });
    } finally {
      setLoading(false);
      setQr('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const fillRate = stats
    ? Math.round((Number(stats.checked_in) / Number(stats.total_tickets || 1)) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('checkin.title')}</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: t('checkin.totalTickets'), value: stats.total_tickets, color: 'text-gray-700' },
            { label: t('checkin.checkedIn'),    value: stats.checked_in,    color: 'text-green-600' },
            { label: t('checkin.remaining'),    value: stats.remaining,     color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{t('checkin.checkInRate')}</span>
            <span className="font-semibold">{fillRate}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${fillRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Scan form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">{t('checkin.scanQR')}</h2>
        <form onSubmit={handleScan} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={qr}
            onChange={e => setQr(e.target.value)}
            placeholder={t('checkin.scanPlaceholder')}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !qr.trim()}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {loading ? '...' : t('checkin.checkInBtn')}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          {t('checkin.scanHint')}
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 mb-6 ${
          result.ok
            ? 'bg-green-50 border-green-200'
            : result.error === 'Already checked in'
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {result.ok ? '✅' : result.error === 'Already checked in' ? '⚠️' : '❌'}
            </span>
            <div>
              <p className={`font-semibold ${
                result.ok ? 'text-green-700' : result.error === 'Already checked in' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {result.ok ? t('checkin.successMsg') : result.error}
              </p>
              {result.ticket && (
                <div className="mt-2 text-sm space-y-0.5 text-gray-600">
                  <p><span className="font-medium">{t('checkin.guestLabel')}</span> {result.ticket.full_name} ({result.ticket.email})</p>
                  <p><span className="font-medium">{t('checkin.seatLabel')}</span> {result.ticket.zone_name} — {result.ticket.seat_label}</p>
                  {result.ticket.checked_in_at && (
                    <p><span className="font-medium">{t('checkin.scannedAt')}</span> {new Date(result.ticket.checked_in_at).toLocaleTimeString(locale)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">{t('checkin.historyTitle')} ({history.length})</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {history.map(ticket => (
              <div key={ticket.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ticket.full_name}</p>
                  <p className="text-xs text-gray-400">{ticket.zone_name} — {ticket.seat_label}</p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(ticket.checked_in_at).toLocaleTimeString(locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
