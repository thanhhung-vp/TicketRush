import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CreditCard, Download, RotateCcw, Send, X } from 'lucide-react';
import api from '../lib/api.js';
import ticketLogo from '../ticketlogo.png';
import ticketsBackdrop from '../../24504411_15690.jpg';
import { downloadTicketsImage, filterTicketsForSeat } from '../utils/ticketDownload.js';
import {
  buildPendingOrderCheckoutState,
  isPendingOrderActionable,
} from '../utils/pendingOrderActions.js';

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
  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState([]);
  const [transferActionId, setTransferActionId] = useState('');
  const [transferNotice, setTransferNotice] = useState(null);

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError(t('myTickets.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const refreshOrders = useCallback(async () => {
    const response = await api.get('/orders');
    setOrders(Array.isArray(response.data) ? response.data : []);
  }, []);

  const loadIncomingTransfers = useCallback(async () => {
    try {
      const response = await api.get('/ticket-transfers/incoming');
      setIncomingTransfers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setIncomingTransfers([]);
    }
  }, []);

  const loadOutgoingTransfers = useCallback(async () => {
    try {
      const response = await api.get('/ticket-transfers/outgoing');
      setOutgoingTransfers(Array.isArray(response.data) ? response.data : []);
    } catch {
      setOutgoingTransfers([]);
    }
  }, []);

  useEffect(() => {
    loadIncomingTransfers();
    loadOutgoingTransfers();
  }, [loadIncomingTransfers, loadOutgoingTransfers]);

  const handleTransferAction = useCallback(async (transferId, action) => {
    const actionKey = `${action}:${transferId}`;
    setTransferActionId(actionKey);
    setTransferNotice(null);

    try {
      await api.post(`/ticket-transfers/${transferId}/${action}`);
      const messageKey = action === 'accept'
        ? 'myTickets.transferAccepted'
        : action === 'decline'
          ? 'myTickets.transferDeclined'
          : 'myTickets.transferCancelled';
      setTransferNotice({
        type: 'success',
        text: t(messageKey),
      });
      await Promise.all([refreshOrders(), loadIncomingTransfers(), loadOutgoingTransfers()]);
    } catch (err) {
      setTransferNotice({
        type: 'error',
        text: err.response?.data?.error || t('myTickets.transferActionError'),
      });
    } finally {
      setTransferActionId('');
    }
  }, [loadIncomingTransfers, loadOutgoingTransfers, refreshOrders, t]);

  const filteredOrders = useMemo(
    () => orders.filter(order => {
      if (!matchesStatus(order, statusFilter)) return false;
      // Pending orders are ungrouped by time — show all regardless of event date
      if (statusFilter === 'pending') return true;
      return matchesTime(order, timeFilter);
    }),
    [orders, statusFilter, timeFilter]
  );

  const stats = useMemo(() => {
    const paidOrders = orders.filter(order => order.status === 'paid').length;
    const activeTickets = orders.reduce((total, order) => {
      if (order.status !== 'paid') return total;
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

          {statusFilter !== 'pending' && (
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
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        {transferNotice?.text && (
          <div
            className={`mt-6 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm ${
              transferNotice.type === 'error'
                ? 'border-rose-200 bg-rose-50/90 text-rose-700'
                : 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
            }`}
          >
            {transferNotice.text}
          </div>
        )}

        <IncomingTransfers
          transfers={incomingTransfers}
          actionId={transferActionId}
          onAction={handleTransferAction}
          locale={locale}
        />

        <OutgoingTransfers
          transfers={outgoingTransfers.filter(transfer => transfer.status === 'pending')}
          actionId={transferActionId}
          onCancel={(transferId) => handleTransferAction(transferId, 'cancel')}
          locale={locale}
        />

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
              <TicketOrderCard
                key={order.id}
                order={order}
                locale={locale}
                onOrdersRefresh={refreshOrders}
                onTransfersRefresh={loadOutgoingTransfers}
                onTransferNotice={setTransferNotice}
              />
            ))}
          </div>
        )}
      </div>
    </TicketsPageFrame>
  );
}

function IncomingTransfers({ transfers, actionId, onAction, locale }) {
  const { t } = useTranslation();

  if (!transfers.length) return null;

  return (
    <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/90 p-4 shadow-lg shadow-emerald-900/10 backdrop-blur">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-emerald-800">{t('myTickets.incomingTransfers')}</p>
          <p className="text-sm font-semibold text-emerald-700">{t('myTickets.incomingTransfersHint')}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {transfers.map(transfer => {
          const accepting = actionId === `accept:${transfer.id}`;
          const declining = actionId === `decline:${transfer.id}`;
          const seatLabel = `${transfer.zone || t('myTickets.zone')} ${transfer.label || ''}`.trim();

          return (
            <div
              key={transfer.id}
              className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-950">{transfer.event_title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {t('myTickets.transferFrom', { email: transfer.sender_email })}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {seatLabel} · {formatDate(transfer.event_date, locale)} · {formatVND(transfer.price)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => onAction(transfer.id, 'accept')}
                  disabled={Boolean(actionId)}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {accepting ? t('myTickets.acceptingTransfer') : t('myTickets.acceptTransfer')}
                </button>
                <button
                  type="button"
                  onClick={() => onAction(transfer.id, 'decline')}
                  disabled={Boolean(actionId)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-wait disabled:opacity-70"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {declining ? t('myTickets.decliningTransfer') : t('myTickets.declineTransfer')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OutgoingTransfers({ transfers, actionId, onCancel, locale }) {
  const { t } = useTranslation();

  if (!transfers.length) return null;

  return (
    <section className="mt-6 rounded-lg border border-cyan-200 bg-cyan-50/90 p-4 shadow-lg shadow-cyan-900/10 backdrop-blur">
      <div>
        <p className="text-sm font-extrabold text-cyan-800">{t('myTickets.outgoingTransfers')}</p>
        <p className="text-sm font-semibold text-cyan-700">{t('myTickets.outgoingTransfersHint')}</p>
      </div>

      <div className="mt-4 space-y-3">
        {transfers.map(transfer => {
          const cancelling = actionId === `cancel:${transfer.id}`;
          const seatLabel = `${transfer.zone || t('myTickets.zone')} ${transfer.label || ''}`.trim();

          return (
            <div
              key={transfer.id}
              className="flex flex-col gap-3 rounded-md border border-cyan-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-950">{transfer.event_title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {t('myTickets.transferTo', { email: transfer.recipient_email })}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {seatLabel} · {formatDate(transfer.event_date, locale)} · {formatVND(transfer.price)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onCancel(transfer.id)}
                disabled={Boolean(actionId)}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-wait disabled:opacity-70"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {cancelling ? t('myTickets.cancellingTransfer') : t('myTickets.cancelTransfer')}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TicketOrderCard({ order, locale, onOrdersRefresh, onTransfersRefresh, onTransferNotice }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloadingSeatId, setDownloadingSeatId] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [transferTicketId, setTransferTicketId] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferLoadingId, setTransferLoadingId] = useState('');
  const [transferError, setTransferError] = useState('');
  const [refundTicketId, setRefundTicketId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoadingId, setRefundLoadingId] = useState('');
  const [refundError, setRefundError] = useState('');

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
  const canManageTickets = order.status === 'paid';
  const canActOnPendingOrder = isPendingOrderActionable(order);
  const downloadLabels = {
    brand: 'TicketRush',
    ticketCode: t('tickets.ticketCode'),
    seat: t('tickets.seatZone'),
    location: t('myTickets.location'),
    time: t('myTickets.time'),
    gate: t('tickets.showAtGate'),
    price: t('event.price'),
  };

  const handleDownloadTicket = async (seat) => {
    setDownloadError('');
    setDownloadingSeatId(seat.seat_id);

    try {
      const response = await api.get(`/orders/${order.id}/tickets`);
      const payload = response.data;
      const tickets = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      const selectedTickets = filterTicketsForSeat(tickets, seat);

      await downloadTicketsImage({ order, tickets: selectedTickets, locale, labels: downloadLabels });
    } catch {
      setDownloadError(t('myTickets.downloadError'));
    } finally {
      setDownloadingSeatId('');
    }
  };

  const handleOpenTransfer = (seat) => {
    setTransferTicketId(seat.ticket_id || '');
    setTransferEmail('');
    setTransferError('');
    setRefundTicketId('');
    setRefundReason('');
    setRefundError('');
    onTransferNotice?.(null);
  };

  const handleSubmitTransfer = async (seat) => {
    if (!seat.ticket_id) return;
    if (!transferEmail.trim()) {
      setTransferError(t('myTickets.transferEmailRequired'));
      return;
    }

    setTransferLoadingId(seat.ticket_id);
    setTransferError('');
    onTransferNotice?.(null);

    try {
      await api.post(`/ticket-transfers/tickets/${seat.ticket_id}`, {
        recipient_email: transferEmail,
      });
      setTransferTicketId('');
      setTransferEmail('');
      onTransferNotice?.({ type: 'success', text: t('myTickets.transferSuccess') });
      await Promise.all([
        onOrdersRefresh?.(),
        onTransfersRefresh?.(),
      ]);
    } catch (err) {
      const message = err.response?.data?.error || t('myTickets.transferError');
      setTransferError(message);
      onTransferNotice?.({ type: 'error', text: message });
    } finally {
      setTransferLoadingId('');
    }
  };

  const handleOpenRefund = (seat) => {
    setRefundTicketId(seat.ticket_id || '');
    setRefundReason('');
    setRefundError('');
    setTransferTicketId('');
    setTransferEmail('');
    setTransferError('');
    onTransferNotice?.(null);
  };

  const handleSubmitRefund = async (seat) => {
    if (!seat.ticket_id) return;

    setRefundLoadingId(seat.ticket_id);
    setRefundError('');
    onTransferNotice?.(null);

    try {
      await api.post(`/ticket-refunds/tickets/${seat.ticket_id}`, {
        reason: refundReason,
      });
      setRefundTicketId('');
      setRefundReason('');
      onTransferNotice?.({ type: 'success', text: t('myTickets.refundSuccess') });
      await onOrdersRefresh?.();
    } catch (err) {
      const message = err.response?.data?.error || t('myTickets.refundError');
      setRefundError(message);
      onTransferNotice?.({ type: 'error', text: message });
    } finally {
      setRefundLoadingId('');
    }
  };

  const handlePayPendingOrder = () => {
    navigate('/checkout', { state: buildPendingOrderCheckoutState(order) });
  };

  const handleCancelPendingOrder = async () => {
    if (!window.confirm(t('myTickets.cancelPendingConfirm'))) return;

    setPendingAction('cancel');
    onTransferNotice?.(null);

    try {
      await api.post('/payment/cancel', { order_id: order.id });
      onTransferNotice?.({ type: 'success', text: t('myTickets.cancelPendingSuccess') });
      await onOrdersRefresh?.();
    } catch (err) {
      const message = err.response?.data?.error || t('myTickets.cancelPendingError');
      onTransferNotice?.({ type: 'error', text: message });
      await onOrdersRefresh?.();
    } finally {
      setPendingAction('');
    }
  };

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
              <SeatList
                title={canManageTickets ? t('myTickets.activeList') : t('myTickets.pendingOrder')}
                items={activeItems}
                readOnly={!canManageTickets}
                onDownload={canManageTickets ? handleDownloadTicket : undefined}
                downloadingSeatId={downloadingSeatId}
                onTransfer={canManageTickets ? handleOpenTransfer : undefined}
                onRefund={canManageTickets ? handleOpenRefund : undefined}
                transferTicketId={transferTicketId}
                transferEmail={transferEmail}
                onTransferEmailChange={setTransferEmail}
                onSubmitTransfer={handleSubmitTransfer}
                onCancelTransfer={() => {
                  setTransferTicketId('');
                  setTransferEmail('');
                  setTransferError('');
                }}
                transferLoadingId={transferLoadingId}
                transferError={transferError}
                refundTicketId={refundTicketId}
                refundReason={refundReason}
                onRefundReasonChange={setRefundReason}
                onSubmitRefund={handleSubmitRefund}
                onCancelRefund={() => {
                  setRefundTicketId('');
                  setRefundReason('');
                  setRefundError('');
                }}
                refundLoadingId={refundLoadingId}
                refundError={refundError}
              />
            )}
            {cancelledItems.length > 0 && (
              <SeatList title={t('myTickets.cancelledList')} items={cancelledItems} cancelled />
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xl font-extrabold text-emerald-600">{formatVND(order.total_amount)}</span>
            {order.status === 'pending' && canActOnPendingOrder ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handlePayPendingOrder}
                  disabled={Boolean(pendingAction)}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  {t('myTickets.payPendingOrder')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPendingOrder}
                  disabled={Boolean(pendingAction)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-70"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {pendingAction === 'cancel'
                    ? t('myTickets.cancellingPendingOrder')
                    : t('myTickets.cancelPendingOrder')}
                </button>
              </div>
            ) : order.status === 'paid' && activeItems.length > 0 ? (
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className="text-sm font-semibold text-slate-500">{t('myTickets.downloadHint')}</span>
                {downloadError && (
                  <p className="max-w-56 text-sm font-semibold text-rose-600 sm:text-right">
                    {downloadError}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-500">
                {order.status === 'pending'
                  ? t('myTickets.pendingOrder')
                  : order.status === 'paid'
                    ? t('myTickets.transferredOrder')
                    : t('myTickets.cancelledOrder')}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SeatList({
  title,
  items,
  cancelled = false,
  readOnly = false,
  onDownload,
  downloadingSeatId = '',
  onTransfer,
  onRefund,
  transferTicketId = '',
  transferEmail = '',
  onTransferEmailChange,
  onSubmitTransfer,
  onCancelTransfer,
  transferLoadingId = '',
  transferError = '',
  refundTicketId = '',
  refundReason = '',
  onRefundReasonChange,
  onSubmitRefund,
  onCancelRefund,
  refundLoadingId = '',
  refundError = '',
}) {
  const { t } = useTranslation();
  const titleClass = cancelled
    ? 'text-rose-700'
    : readOnly
      ? 'text-amber-700'
      : 'text-cyan-700';
  const readOnlyClass = readOnly
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-cyan-100 bg-cyan-50 text-cyan-800';

  return (
    <div>
      <p className={`mb-2 text-xs font-bold ${titleClass}`}>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const itemLabel = `${item.zone || t('myTickets.zone')} ${item.label || ''}`.trim();
          if (cancelled || readOnly || !onDownload) {
            return (
              <span
                key={item.action_id || item.seat_id}
                className={`rounded-md border px-3 py-1.5 text-sm font-bold ${
                  cancelled ? 'border-rose-200 bg-rose-50 text-rose-700' : readOnlyClass
                }`}
                title={item.reason || ''}
              >
                {itemLabel}
              </span>
            );
          }

          const downloading = downloadingSeatId === item.seat_id;
          const transferOpen = transferTicketId === item.ticket_id;
          const transferLoading = transferLoadingId === item.ticket_id;
          const refundOpen = refundTicketId === item.ticket_id;
          const refundLoading = refundLoadingId === item.ticket_id;
          return (
            <div
              key={item.ticket_id || item.seat_id}
              className="max-w-full rounded-md border border-cyan-100 bg-white/75 p-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  disabled={Boolean(downloadingSeatId)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-bold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-70"
                  title={t('myTickets.downloadTicket')}
                >
                  <span>{itemLabel}</span>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-extrabold text-cyan-700">
                    {downloading ? t('myTickets.downloadingTicket') : t('myTickets.downloadTicket')}
                  </span>
                </button>

                {item.refund_status === 'pending' && (
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800" title={t('myTickets.refundPendingDesc')}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-extrabold">{t('myTickets.refundPendingDesc')}</span>
                  </span>
                )}

                {item.ticket_id && onTransfer && item.refund_status !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => onTransfer(item)}
                    disabled={Boolean(transferLoadingId)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
                    title={t('myTickets.transferTicket')}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-extrabold">{t('myTickets.transferTicket')}</span>
                  </button>
                )}

                {item.can_refund && onRefund && item.refund_status !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => onRefund(item)}
                    disabled={Boolean(refundLoadingId)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70"
                    title={t('myTickets.refundTicket')}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-extrabold">{t('myTickets.refundTicket')}</span>
                  </button>
                )}
              </div>

              {transferOpen && item.refund_status !== 'pending' && (
                <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={transferEmail}
                    onChange={(event) => onTransferEmailChange?.(event.target.value)}
                    placeholder={t('myTickets.transferEmailPlaceholder')}
                    className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => onSubmitTransfer?.(item)}
                    disabled={transferLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {transferLoading ? t('myTickets.transferSending') : t('myTickets.transferSend')}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelTransfer}
                    disabled={transferLoading}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {transferOpen && transferError && (
                <p className="mt-2 text-xs font-semibold text-rose-600">{transferError}</p>
              )}

              {refundOpen && (
                <div className="mt-2 flex w-full flex-col gap-2">
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(event) => onRefundReasonChange?.(event.target.value)}
                    placeholder={t('myTickets.refundReasonPlaceholder')}
                    className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-amber-400"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => onSubmitRefund?.(item)}
                      disabled={refundLoading}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-amber-500 px-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-70"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {refundLoading ? t('myTickets.refundSubmitting') : t('myTickets.refundSubmit')}
                    </button>
                    <button
                      type="button"
                      onClick={onCancelRefund}
                      disabled={refundLoading}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-amber-700">{t('myTickets.refundDemoNote')}</p>
                </div>
              )}

              {refundOpen && refundError && (
                <p className="mt-2 text-xs font-semibold text-rose-600">{refundError}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
