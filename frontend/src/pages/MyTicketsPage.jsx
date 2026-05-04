import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import ticketLogo from '../ticketlogo.png';
import ticketsBackdrop from '../../24504411_15690.jpg';

const PAGE_BACKGROUND_STYLE = {
  backgroundImage: `linear-gradient(125deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76) 48%, rgba(255,255,255,0.88)), url(${ticketsBackdrop})`,
};

function formatDate(d, locale = 'vi-VN') {
  return new Date(d).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));
}

function hasCancelledTickets(order) {
  return order.status === 'cancelled' || (order.cancelled_items || []).length > 0;
}

function matchesStatus(order, status) {
  if (status === 'all') return true;
  if (status === 'cancelled') return hasCancelledTickets(order);
  return order.status === status;
}

function matchesTime(order, timeFilter) {
  const eventTime = new Date(order.event_date).getTime();
  if (Number.isNaN(eventTime)) return true;
  return timeFilter === 'upcoming' ? eventTime >= Date.now() : eventTime < Date.now();
}

function getBadgeClass(status) {
  if (status === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-rose-200 bg-rose-50 text-rose-700';
}

function TicketsPageFrame({ children }) {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed text-slate-900"
      style={PAGE_BACKGROUND_STYLE}
    >
      {children}
    </div>
  );
}

export default function MyTicketsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const STATUS_FILTERS = [
    { key: 'all',       label: t('myTickets.all') },
    { key: 'paid',      label: t('myTickets.paid') },
    { key: 'pending',   label: t('myTickets.pending') },
    { key: 'cancelled', label: t('myTickets.cancelled') },
  ];

  const TIME_FILTERS = [
    { key: 'upcoming', label: t('myTickets.upcoming') },
    { key: 'ended',    label: t('myTickets.ended') },
  ];

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError(t('myTickets.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter(order => matchesStatus(order, statusFilter) && matchesTime(order, timeFilter)),
    [orders, statusFilter, timeFilter]
  );

  const stats = useMemo(() => {
    const paidOrders = orders.filter(order => order.status === 'paid').length;
    const activeTickets = orders.reduce((total, order) => {
      if (order.status === 'cancelled') return total;
      return total + (order.items || []).length;
    }, 0);
    return [
      { label: t('myTickets.totalOrders'),  value: orders.length },
      { label: t('myTickets.activeTickets'), value: activeTickets },
      { label: t('myTickets.successCount'), value: paidOrders },
    ];
  }, [orders, t]);

  if (loading) {
    return (
      <TicketsPageFrame>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center text-base font-semibold text-slate-700 sm:px-6">
          {t('common.loading')}
        </div>
      </TicketsPageFrame>
    );
  }

  return (
    <TicketsPageFrame>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-cyan-700">TicketRush</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-950 sm:text-4xl">{t('myTickets.title')}</h1>
          </div>
          <Link
            to="/"
            className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            {t('myTickets.explore')}
          </Link>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map(item => (
            <div
              key={item.label}
              className="rounded-lg border border-white/80 bg-white/75 px-4 py-3 shadow-md shadow-cyan-900/5 backdrop-blur"
            >
              <p className="text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-white/80 bg-white/75 p-3 shadow-lg shadow-cyan-900/10 backdrop-blur">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {STATUS_FILTERS.map(filter => {
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`h-11 rounded-full text-sm font-bold transition ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-yellow-300 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'border border-slate-200 bg-white/80 text-slate-600 hover:border-cyan-300 hover:text-slate-950'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-white/80 p-1">
              {TIME_FILTERS.map(filter => {
                const active = timeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    onClick={() => setTimeFilter(filter.key)}
                    className={`h-9 rounded-full px-4 text-sm font-bold transition ${
                      active
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-950'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-lg border border-white/80 bg-white/80 px-6 py-12 text-center shadow-lg shadow-cyan-900/10 backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-100 to-yellow-100">
              <img src={ticketLogo} alt="" className="h-7 w-7 object-contain" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700">{t('myTickets.noMatch')}</p>
            <Link
              to="/"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5"
            >
              {t('myTickets.exploreEvents')}
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredOrders.map(order => (
              <TicketOrderCard key={order.id} order={order} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </TicketsPageFrame>
  );
}

function TicketOrderCard({ order, locale }) {
  const { t } = useTranslation();

  const STATUS_LABELS = {
    paid:      t('myTickets.paid'),
    pending:   t('myTickets.pending'),
    cancelled: t('myTickets.cancelled'),
  };

  const orderItems = order.items || [];
  const activeItems = order.status === 'cancelled' ? [] : orderItems;
  const cancelledItems = [
    ...(order.cancelled_items || []),
    ...(order.status === 'cancelled'
      ? orderItems.map(item => ({ ...item, action_id: `cancelled-${order.id}-${item.seat_id}` }))
      : []),
  ];
  const status = order.status === 'cancelled' ? 'cancelled' : order.status;

  return (
    <article className="overflow-hidden rounded-lg border border-white/80 bg-white/80 shadow-lg shadow-cyan-900/10 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-900/20">
      <div className="grid gap-0 md:grid-cols-[190px_1fr]">
        <div className="h-48 bg-gradient-to-br from-cyan-100 via-white to-yellow-100 p-3 md:h-full">
          {order.poster_url ? (
            <img
              src={order.poster_url}
              alt={order.event_title}
              className="h-full w-full rounded-md object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-md border border-white/80 bg-white/70">
              <img src={ticketLogo} alt="" className="h-12 w-12 object-contain opacity-80" />
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold text-slate-950">{order.event_title}</h2>
              <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-slate-800">{t('myTickets.location')}</dt>
                  <dd className="mt-0.5 truncate">{order.venue}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-800">{t('myTickets.time')}</dt>
                  <dd className="mt-0.5">{formatDate(order.event_date, locale)}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${getBadgeClass(status)}`}>
                {STATUS_LABELS[status] || status}
              </span>
              {cancelledItems.length > 0 && order.status !== 'cancelled' && (
                <span className="w-fit rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  {t('myTickets.hasCancelled')}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {activeItems.length > 0 && (
              <SeatList title={t('myTickets.activeList')} items={activeItems} />
            )}
            {cancelledItems.length > 0 && (
              <SeatList title={t('myTickets.cancelledList')} items={cancelledItems} cancelled />
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xl font-extrabold text-emerald-600">{formatVND(order.total_amount)}</span>
            {order.status === 'paid' && activeItems.length > 0 ? (
              <Link
                to={`/orders/${order.id}/tickets`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:-translate-y-0.5 hover:brightness-105"
              >
                {t('myTickets.viewTicket')}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-slate-500">
                {order.status === 'pending' ? t('myTickets.pendingOrder') : t('myTickets.cancelledOrder')}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SeatList({ title, items, cancelled = false }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className={`mb-2 text-xs font-bold ${cancelled ? 'text-rose-700' : 'text-cyan-700'}`}>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item.action_id || item.seat_id}
            className={`rounded-md border px-3 py-1.5 text-sm font-bold ${
              cancelled
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-cyan-200 bg-cyan-50 text-cyan-800'
            }`}
            title={item.reason || ''}
          >
            {item.zone || t('myTickets.zone')} {item.label || ''}
          </span>
        ))}
      </div>
    </div>
  );
}
