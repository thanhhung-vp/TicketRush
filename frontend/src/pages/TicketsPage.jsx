import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';

function formatDate(d, locale = 'vi-VN') {
  return new Date(d).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TicketsPage() {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams();
  const { state }   = useLocation();
  const [tickets, setTickets] = useState(normalizeTicketList(state?.tickets));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  useEffect(() => {
    let cancelled = false;
    setError('');
    setLoading(true);

    api.get(`/orders/${orderId}/tickets`)
      .then(r => {
        if (!cancelled) setTickets(normalizeTicketList(r.data));
      })
      .catch(() => {
        if (!cancelled) setError(t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  if (loading) return <div className="text-center py-20 text-gray-400">{t('tickets.loading')}</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">{t('tickets.success')}</h1>
      <p className="text-gray-400 mb-10">
        {t('tickets.qrReady', { count: tickets.length })}
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {tickets.length > 0 ? (
        <div className="mb-10 space-y-4 text-left">
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="mb-10 text-sm font-medium text-gray-500">{t('tickets.noTickets')}</p>
      )}

      <div className="flex flex-col gap-3">
        <Link
          to="/my-tickets"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 transition"
        >
          {t('tickets.viewAllLink')}
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950 font-medium px-6 py-3 transition dark:border-dark-border dark:bg-dark-surface dark:text-gray-300 dark:hover:text-white"
        >
          {t('tickets.exploreMore')}
        </Link>
      </div>
    </div>
  );
}

function normalizeTicketList(payload) {
  const rows = payload?.data ?? payload;
  return Array.isArray(rows) ? rows : [];
}

function TicketCard({ ticket, locale }) {
  const { t } = useTranslation();
  const [showQR, setShowQR] = useState(false);

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = ticket.qr_code;
    link.download = `ticket-${String(ticket.id || 'ticket').slice(0, 8)}.png`;
    link.click();
  };
  const ticketCode = String(ticket.id || '').slice(0, 12).toUpperCase();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-200/70 dark:border-dark-border dark:bg-dark-card dark:text-gray-100 dark:shadow-black/20">
      {/* Header stripe */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-white to-rose-50 px-6 py-4 dark:border-dark-border dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{ticket.event_title}</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-gray-300">📍 {ticket.venue}</p>
        <p className="text-sm font-medium text-slate-600 dark:text-gray-300">📅 {formatDate(ticket.event_date, locale)}</p>
      </div>

      {/* Seat info + QR */}
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">{t('tickets.seatZone')}</p>
          <p className="text-xl font-bold text-slate-950 dark:text-white">{ticket.zone} — {ticket.label}</p>
          <p className="mt-1 font-mono text-xs text-slate-400 dark:text-gray-500">#{ticketCode}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setShowQR(v => !v)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 transition hover:border-blue-200 hover:bg-blue-50 dark:border-dark-border dark:bg-slate-800 dark:hover:bg-slate-700"
            title={t('tickets.viewQR')}
          >
            {showQR ? (
              <img src={ticket.qr_code} alt="QR" className="w-28 h-28" />
            ) : (
              <div className="flex h-28 w-28 flex-col items-center justify-center text-slate-500 dark:text-gray-300">
                <span className="text-3xl">📱</span>
                <span className="text-xs mt-1">{t('tickets.viewQR')}</span>
              </div>
            )}
          </button>

          {showQR && (
            <button
              onClick={downloadQR}
              className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
            >
              ⬇ {t('tickets.downloadQR')}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-dark-border dark:bg-slate-950/30">
        <span className="text-xs font-medium text-slate-500 dark:text-gray-400">{t('tickets.showAtGate')}</span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          {t('tickets.valid')}
        </span>
      </div>
    </div>
  );
}
