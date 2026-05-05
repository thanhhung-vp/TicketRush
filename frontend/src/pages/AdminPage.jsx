import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(n);
}
function formatVNDLong(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (d) => new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const formatDateTime = (d) => new Date(d).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const loadAdminData = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const [d, e] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/events'),
      ]);
      setDashboard(d.data);
      setEvents(e.data);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    loadAdminData().catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  const totalRevenue = dashboard?.events?.reduce((s, e) => s + Number(e.total_revenue), 0) || 0;
  const totalOrders  = dashboard?.events?.reduce((s, e) => s + Number(e.orders_paid), 0) || 0;
  const totalSold    = dashboard?.events?.reduce((s, e) => s + Number(e.sold_seats), 0) || 0;

  const TABS = [
    ['dashboard', t('admin.tabOverview')],
    ['events',    t('admin.tabEvents')],
    ['customers', t('admin.tabCustomers')],
    ['refunds',   t('admin.tabRefunds')],
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <Link to="/admin/events/new"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/25">
          {t('admin.createEventBtn')}
        </Link>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-xl mb-6 w-fit border border-gray-200 shadow-sm">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <DashboardTab
          totalRevenue={totalRevenue}
          totalOrders={totalOrders}
          totalSold={totalSold}
          events={dashboard?.events || []}
          revenueByDay={dashboard?.revenue_by_day || []}
          formatDate={formatDate}
          t={t}
        />
      )}
      {tab === 'events' && (
        <EventsTab
          events={events}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          t={t}
          locale={locale}
          onChanged={() => loadAdminData({ showLoading: false })}
        />
      )}
      {tab === 'customers' && <CustomerManagementTab events={events} formatDateTime={formatDateTime} formatVNDLong={formatVNDLong} t={t} />}
      {tab === 'refunds' && <RefundsTab formatDateTime={formatDateTime} formatVNDLong={formatVNDLong} t={t} />}
    </div>
  );
}

function StatCard({ label, value, sub, gradient }) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-lg ${gradient}`}>
      <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay, formatDate, t }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t('admin.totalRevenue')} value={formatVND(totalRevenue)} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard label={t('admin.successOrders')} value={totalOrders.toLocaleString()} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard label={t('admin.ticketsSold')} value={totalSold.toLocaleString()} gradient="bg-gradient-to-br from-violet-500 to-violet-700" />
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">{t('admin.revenueLast30')}</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay.map(r => ({ ...r, revenue: Number(r.revenue) }))}>
            <XAxis dataKey="day" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickFormatter={v => formatVND(v)} tick={{ fontSize: 11, fill: '#6b7280' }} width={70} />
            <Tooltip
              formatter={(v) => formatVND(v)}
              labelFormatter={formatDate}
              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              labelStyle={{ color: '#374151', fontWeight: 600 }}
              itemStyle={{ color: '#3b82f6' }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">{t('admin.occupancyByEvent')}</h2>
        <div className="space-y-3">
          {events.map(e => {
            const pct = e.total_seats > 0 ? Math.round((e.sold_seats / e.total_seats) * 100) : 0;
            const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 20 ? 'bg-amber-500' : 'bg-gray-400';
            return (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate max-w-xs text-gray-700 font-medium">{e.title}</span>
                  <span className="text-gray-500 ml-2">{pct}% ({e.sold_seats}/{e.total_seats})</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const MAP = {
    draft:   'bg-gray-100 text-gray-600 border border-gray-300',
    on_sale: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ended:   'bg-red-50 text-red-600 border border-red-200',
  };
  const LABEL = {
    draft:   t('admin.statusDraft'),
    on_sale: t('admin.statusOnSale'),
    ended:   t('admin.statusEnded'),
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${MAP[status]}`}>{LABEL[status]}</span>;
}

function canDeleteEventFromStats(event) {
  const soldSeats = Number(event.sold_seats || 0);
  const lockedSeats = Number(event.locked_seats || 0);
  const orderCount = Number(event.order_count || 0);
  const adminActionCount = Number(event.admin_action_count || 0);
  return soldSeats === 0 && lockedSeats === 0 && orderCount === 0 && adminActionCount === 0;
}

function EventsTab({ events, t, locale, onChanged }) {
  const [batchSizes, setBatchSizes] = useState({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const getBatchSize = (event) => Number(batchSizes[event.id] ?? event.queue_batch_size ?? 50);

  const runAction = async (busyKey, action) => {
    setBusy(busyKey);
    setNotice('');
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể thực hiện thao tác.');
    } finally {
      setBusy('');
    }
  };

  const toggleQueue = (event) => runAction(`queue-${event.id}`, async () => {
    if (event.queue_enabled) {
      await api.post(`/queue/${event.id}/disable`);
      setNotice(`Đã tắt phòng chờ cho "${event.title}".`);
    } else {
      await api.post(`/queue/${event.id}/enable`, { batch_size: getBatchSize(event) });
      setNotice(`Đã bật phòng chờ cho "${event.title}".`);
    }
    await onChanged();
  });

  const admitQueue = (event) => runAction(`admit-${event.id}`, async () => {
    const { data } = await api.post(`/queue/${event.id}/admit`, { batch_size: getBatchSize(event) });
    setNotice(`Đã cấp quyền cho ${data.admitted || 0} người. Còn chờ: ${data.waiting_count || 0}.`);
  });

  const deleteEvent = (event) => runAction(`delete-${event.id}`, async () => {
    if (!window.confirm(`Xóa sự kiện "${event.title}"? Hành động không thể hoàn tác.`)) return;
    await api.delete(`/events/${event.id}`);
    setNotice(`Đã xóa sự kiện "${event.title}".`);
    await onChanged();
  });

  return (
    <div className="space-y-3">
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[t('admin.colEvent'), t('admin.colStatus'), t('admin.colSoldTotal'), 'Virtual Queue', t('admin.colRevenue'), ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map(e => {
                const canDelete = canDeleteEventFromStats(e);
                const seatsEmpty = Number(e.sold_seats || 0) === 0 && Number(e.locked_seats || 0) === 0;
                const actionDisabled = busy !== '';

                return (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{e.title}</p>
                      <p className="text-xs text-gray-500">{new Date(e.event_date).toLocaleDateString(locale)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} t={t} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {e.sold_seats} / {e.total_seats}
                      <span className="text-gray-400 ml-1">({e.locked_seats} {t('admin.held')})</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          e.queue_enabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {e.queue_enabled ? 'Đang bật' : 'Đang tắt'}
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={getBatchSize(e)}
                          onChange={event => setBatchSizes(prev => ({ ...prev, [e.id]: event.target.value }))}
                          className="w-20 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Queue batch size"
                        />
                        <button
                          type="button"
                          onClick={() => toggleQueue(e)}
                          disabled={actionDisabled}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            e.queue_enabled
                              ? 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {busy === `queue-${e.id}` ? 'Đang xử lý...' : e.queue_enabled ? 'Tắt' : 'Bật'}
                        </button>
                        {e.queue_enabled && (
                          <button
                            type="button"
                            onClick={() => admitQueue(e)}
                            disabled={actionDisabled}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                          >
                            {busy === `admit-${e.id}` ? 'Đang cấp...' : 'Cấp lượt'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">
                      {formatVND(e.total_revenue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/admin/events/${e.id}`} className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium transition">
                          {t('admin.detailsLink')}
                        </Link>
                        {seatsEmpty && (
                          <button
                            type="button"
                            onClick={() => deleteEvent(e)}
                            disabled={actionDisabled || !canDelete}
                            title={canDelete ? 'Xóa sự kiện' : 'Không thể xóa vì sự kiện đã có lịch sử đơn/vé'}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy === `delete-${e.id}` ? 'Đang xóa...' : 'Xóa'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomerManagementTab({ events, formatDateTime, formatVNDLong, t }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [history, setHistory] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [seats, setSeats] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    let active = true;
    setLoadingCustomers(true);
    const timer = setTimeout(() => {
      api.get('/admin/customers', { params: { search } })
        .then(r => {
          if (!active) return;
          const rows = Array.isArray(r.data) ? r.data : [];
          setCustomers(rows);
          setSelectedCustomerId(current => (
            current && rows.some(c => c.id === current) ? current : rows[0]?.id || null
          ));
        })
        .catch(() => active && setError(t('admin.loadCustomersError')))
        .finally(() => active && setLoadingCustomers(false));
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    if (!selectedCustomerId) { setHistory(null); return; }
    let active = true;
    setLoadingHistory(true);
    api.get(`/admin/customers/${selectedCustomerId}/history`)
      .then(r => active && setHistory(r.data))
      .catch(() => active && setError(t('admin.loadHistoryError')))
      .finally(() => active && setLoadingHistory(false));
    return () => { active = false; };
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!selectedEventId) { setSeats([]); setSelectedSeatId(''); return; }
    let active = true;
    api.get(`/admin/events/${selectedEventId}/seats`)
      .then(r => {
        if (!active) return;
        const available = (Array.isArray(r.data) ? r.data : []).filter(seat => seat.status === 'available');
        setSeats(available);
        setSelectedSeatId(available[0]?.id || '');
      })
      .catch(() => active && setError(t('admin.loadSeatsError')));
    return () => { active = false; };
  }, [selectedEventId]);

  const refreshHistory = async () => {
    if (!selectedCustomerId) return;
    const { data } = await api.get(`/admin/customers/${selectedCustomerId}/history`);
    setHistory(data);
  };

  const refreshCustomers = async () => {
    const { data } = await api.get('/admin/customers', { params: { search } });
    setCustomers(Array.isArray(data) ? data : []);
  };

  const cancelTicket = async (ticket) => {
    const reason = window.prompt(t('admin.cancelReason'), '');
    if (reason === null) return;
    setBusy(ticket.ticket_id); setError(''); setNotice('');
    try {
      await api.delete(`/admin/tickets/${ticket.ticket_id}`, { data: { reason } });
      await refreshHistory();
      await refreshCustomers();
      setNotice(`${t('admin.actionCancelled')} ${ticket.zone || ''} ${ticket.label || ''}`.trim());
    } catch (err) {
      setError(err.response?.data?.error || t('admin.cancelTicketError'));
    } finally { setBusy(''); }
  };

  const issueTicket = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedSeatId) { setError(t('admin.selectCustomerAndSeat')); return; }
    setBusy('issue'); setError(''); setNotice('');
    try {
      await api.post(`/admin/customers/${selectedCustomerId}/tickets`, {
        seat_id: selectedSeatId,
        reason: issueReason || undefined,
      });
      const { data } = await api.get(`/admin/events/${selectedEventId}/seats`);
      const available = (Array.isArray(data) ? data : []).filter(seat => seat.status === 'available');
      setSeats(available);
      setSelectedSeatId(available[0]?.id || '');
      setIssueReason('');
      await refreshHistory();
      await refreshCustomers();
      setNotice(t('admin.issueTicketSuccess'));
    } catch (err) {
      setError(err.response?.data?.error || t('admin.issueTicketError'));
    } finally { setBusy(''); }
  };

  const selectedCustomer = selectedCustomerId
    ? { ...(customers.find(c => c.id === selectedCustomerId) || {}), ...(history?.customer || {}) }
    : null;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('admin.searchCustomer')}</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.searchCustomerPlaceholder')}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-[640px] overflow-auto">
          {loadingCustomers ? (
            <p className="p-4 text-sm text-gray-400">{t('admin.loadingCustomers')}</p>
          ) : customers.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">{t('admin.noCustomers')}</p>
          ) : customers.map(customer => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomerId(customer.id)}
              className={`block w-full text-left px-4 py-3 border-b border-gray-100 transition ${
                selectedCustomerId === customer.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <p className="font-semibold text-gray-800 truncate">{customer.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{customer.email}</p>
              <p className="mt-1 text-xs text-gray-400">
                {customer.ticket_count} {t('admin.ticketCountLabel')} · {customer.cancelled_ticket_count || 0} {t('admin.cancelledCountLabel')}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        {!selectedCustomer ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-400">
            {t('admin.selectCustomerHint')}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedCustomer.full_name}</h2>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
                <div className="text-sm text-gray-500 sm:text-right">
                  <p>{t('admin.totalSpent')} <span className="font-bold text-blue-600">{formatVNDLong(selectedCustomer.total_spent)}</span></p>
                  <p>{t('admin.createdAt')} {formatDateTime(selectedCustomer.created_at)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={issueTicket} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">{t('admin.addTicketTitle')}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
                <select
                  value={selectedSeatId}
                  onChange={e => setSelectedSeatId(e.target.value)}
                  className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {seats.length === 0 ? (
                    <option value="">{t('admin.noSeatsLeft')}</option>
                  ) : seats.map(seat => (
                    <option key={seat.id} value={seat.id}>
                      {seat.zone_name} {seat.label} · {formatVNDLong(seat.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={issueReason}
                  onChange={e => setIssueReason(e.target.value)}
                  placeholder={t('admin.ticketNoteHint')}
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={busy === 'issue' || !selectedSeatId}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy === 'issue' ? t('admin.addingTicket') : t('admin.addTicket')}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">{t('admin.purchaseHistory')}</h3>
              {loadingHistory ? (
                <p className="text-sm text-gray-400">{t('admin.loadingHistory')}</p>
              ) : (history?.purchases || []).length === 0 ? (
                <p className="text-sm text-gray-400">{t('admin.noPurchaseHistory')}</p>
              ) : (
                <div className="space-y-4">
                  {history.purchases.map(order => (
                    <CustomerOrderCard
                      key={order.id}
                      order={order}
                      busy={busy}
                      onCancelTicket={cancelTicket}
                      formatDateTime={formatDateTime}
                      formatVNDLong={formatVNDLong}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">{t('admin.adminHistory')}</h3>
              {(history?.actions || []).length === 0 ? (
                <p className="text-sm text-gray-400">{t('admin.noAdminHistory')}</p>
              ) : (
                <div className="space-y-3">
                  {history.actions.map(action => (
                    <div key={action.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-gray-800">
                          {action.action_type === 'added' ? t('admin.actionAdded') : t('admin.actionCancelled')} · {action.event_title}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(action.created_at)}</p>
                      </div>
                      <p className="mt-1 text-gray-600">
                        {t('admin.colEvent')}: {action.zone_name || ''} {action.seat_label || ''} · {t('admin.adminLabel')} {action.admin_name || action.admin_email}
                      </p>
                      {action.reason && <p className="mt-1 text-gray-500">{t('admin.noteLabel')} {action.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CustomerOrderCard({ order, busy, onCancelTicket, formatDateTime, formatVNDLong, t }) {
  const tickets = order.tickets || [];
  const STATUS_LABEL = {
    paid:      t('myTickets.paid'),
    pending:   t('myTickets.pending'),
    cancelled: t('myTickets.cancelled'),
  };
  const statusLabel = STATUS_LABEL[order.status] || order.status;
  const statusClass = order.status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : order.status === 'pending'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-600 border-red-200';

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900">{order.event_title}</p>
          <p className="text-sm text-gray-500">{order.venue}</p>
          <p className="text-xs text-gray-400">{formatDateTime(order.event_date)}</p>
        </div>
        <div className="sm:text-right">
          <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass}`}>{statusLabel}</span>
          <p className="mt-1 text-sm font-bold text-blue-600">{formatVNDLong(order.total_amount)}</p>
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tickets.map(ticket => (
            <span key={ticket.ticket_id} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
              {ticket.zone} {ticket.label}
              {order.status === 'paid' && (
                <button
                  type="button"
                  onClick={() => onCancelTicket(ticket)}
                  disabled={busy === ticket.ticket_id}
                  className="ml-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {busy === ticket.ticket_id ? t('admin.cancellingBtn') : t('admin.cancelBtn')}
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RefundsTab({ formatDateTime, formatVNDLong, t }) {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/refunds', { params: { status: statusFilter !== 'all' ? statusFilter : undefined } });
      setRefunds(data);
    } catch (err) {
      setError('Cannot load refund requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter]);

  const handleAction = async (id, action) => {
    if (action === 'approve' && !window.confirm(t('admin.approveConfirm'))) return;
    if (action === 'reject' && !window.confirm(t('admin.rejectConfirm'))) return;

    setBusy(id);
    try {
      await api.post(`/admin/refunds/${id}/${action}`);
      await fetchRefunds();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s === 'all' ? t('common.all') : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : refunds.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Event / Seat</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {refunds.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{r.user_name}</p>
                    <p className="text-xs text-gray-500">{r.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.event_title}</p>
                    <p className="text-xs text-gray-500">{r.zone_name} {r.seat_label}</p>
                    {r.reason && <p className="text-xs text-amber-600 mt-1" title={r.reason}>Note: {r.reason}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{formatVNDLong(r.price)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      r.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                      r.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleAction(r.id, 'approve')} disabled={busy === r.id}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 disabled:opacity-50 transition font-medium">
                          {busy === r.id ? '...' : t('admin.approveRefund')}
                        </button>
                        <button onClick={() => handleAction(r.id, 'reject')} disabled={busy === r.id}
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 disabled:opacity-50 transition font-medium">
                          {busy === r.id ? '...' : t('admin.rejectRefund')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
