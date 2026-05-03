import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(n);
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
function formatDateTime(d) {
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatVNDLong(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/events'),
    ]).then(([d, e]) => {
      setDashboard(d.data);
      setEvents(e.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;

  const totalRevenue = dashboard?.events?.reduce((s, e) => s + Number(e.total_revenue), 0) || 0;
  const totalOrders  = dashboard?.events?.reduce((s, e) => s + Number(e.orders_paid), 0) || 0;
  const totalSold    = dashboard?.events?.reduce((s, e) => s + Number(e.sold_seats), 0) || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <Link to="/admin/events/new"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/25">
          + Tạo sự kiện
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-xl mb-6 w-fit border border-gray-200 shadow-sm">
        {[['dashboard', 'Tổng quan'], ['events', 'Sự kiện'], ['customers', 'Quản lí khách hàng']].map(([k, label]) => (
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
        />
      )}
      {tab === 'events' && <EventsTab events={events} />}
      {tab === 'customers' && <CustomerManagementTab events={events} />}
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

function DashboardTab({ totalRevenue, totalOrders, totalSold, events, revenueByDay }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tổng doanh thu" value={formatVND(totalRevenue)} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard label="Đơn hàng thành công" value={totalOrders.toLocaleString()} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard label="Vé đã bán" value={totalSold.toLocaleString()} gradient="bg-gradient-to-br from-violet-500 to-violet-700" />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">📈 Doanh thu 30 ngày gần nhất</h2>
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

      {/* Per-event occupancy */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="font-semibold mb-4 text-gray-700">🎯 Tỷ lệ lấp đầy theo sự kiện</h2>
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

function EventsTab({ events }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {['Sự kiện', 'Trạng thái', 'Đã bán / Tổng', 'Doanh thu', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{e.title}</p>
                <p className="text-xs text-gray-500">{new Date(e.event_date).toLocaleDateString('vi-VN')}</p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3 text-gray-700">
                {e.sold_seats} / {e.total_seats}
                <span className="text-gray-400 ml-1">({e.locked_seats} đang giữ)</span>
              </td>
              <td className="px-4 py-3 text-blue-600 font-semibold">
                {formatVND(e.total_revenue)}
              </td>
              <td className="px-4 py-3">
                <Link to={`/admin/events/${e.id}`} className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium transition">Chi tiết →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    draft:    'bg-gray-100 text-gray-600 border border-gray-300',
    on_sale:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ended:    'bg-red-50 text-red-600 border border-red-200',
  };
  const LABEL = { draft: 'Nháp', on_sale: 'Đang bán', ended: 'Kết thúc' };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${MAP[status]}`}>{LABEL[status]}</span>;
}

function CustomerManagementTab({ events }) {
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
        .catch(() => active && setError('Không thể tải danh sách khách hàng.'))
        .finally(() => active && setLoadingCustomers(false));
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setHistory(null);
      return;
    }

    let active = true;
    setLoadingHistory(true);
    api.get(`/admin/customers/${selectedCustomerId}/history`)
      .then(r => active && setHistory(r.data))
      .catch(() => active && setError('Không thể tải lịch sử khách hàng.'))
      .finally(() => active && setLoadingHistory(false));

    return () => { active = false; };
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!selectedEventId) {
      setSeats([]);
      setSelectedSeatId('');
      return;
    }

    let active = true;
    api.get(`/admin/events/${selectedEventId}/seats`)
      .then(r => {
        if (!active) return;
        const available = (Array.isArray(r.data) ? r.data : []).filter(seat => seat.status === 'available');
        setSeats(available);
        setSelectedSeatId(available[0]?.id || '');
      })
      .catch(() => active && setError('Không thể tải ghế còn trống.'));

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
    const reason = window.prompt('Lý do hủy vé (tuỳ chọn)', '');
    if (reason === null) return;

    setBusy(ticket.ticket_id);
    setError('');
    setNotice('');
    try {
      await api.delete(`/admin/tickets/${ticket.ticket_id}`, { data: { reason } });
      await refreshHistory();
      await refreshCustomers();
      setNotice(`Đã hủy vé ${ticket.zone || ''} ${ticket.label || ''}`.trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể hủy vé.');
    } finally {
      setBusy('');
    }
  };

  const issueTicket = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedSeatId) {
      setError('Vui lòng chọn khách hàng và ghế còn trống.');
      return;
    }

    setBusy('issue');
    setError('');
    setNotice('');
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
      setNotice('Đã thêm vé cho khách hàng.');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể thêm vé cho khách hàng.');
    } finally {
      setBusy('');
    }
  };

  const selectedCustomer = selectedCustomerId
    ? { ...(customers.find(c => c.id === selectedCustomerId) || {}), ...(history?.customer || {}) }
    : null;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tìm khách hàng</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Email hoặc tên khách"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-[640px] overflow-auto">
          {loadingCustomers ? (
            <p className="p-4 text-sm text-gray-400">Đang tải khách hàng...</p>
          ) : customers.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Không có khách hàng phù hợp.</p>
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
                {customer.ticket_count} vé hiệu lực · {customer.cancelled_ticket_count || 0} vé đã hủy
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
            Chọn một khách hàng để xem lịch sử và thao tác vé.
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
                  <p>Tổng chi: <span className="font-bold text-blue-600">{formatVNDLong(selectedCustomer.total_spent)}</span></p>
                  <p>Ngày tạo: {formatDateTime(selectedCustomer.created_at)}</p>
                </div>
              </div>
            </div>

            <form onSubmit={issueTicket} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">Thêm vé cho khách hàng</h3>
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
                    <option value="">Không còn ghế trống</option>
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
                  placeholder="Ghi chú cấp vé (tuỳ chọn)"
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={busy === 'issue' || !selectedSeatId}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy === 'issue' ? 'Đang thêm...' : 'Thêm vé'}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">Lịch sử mua vé</h3>
              {loadingHistory ? (
                <p className="text-sm text-gray-400">Đang tải lịch sử...</p>
              ) : (history?.purchases || []).length === 0 ? (
                <p className="text-sm text-gray-400">Khách hàng chưa có lịch sử mua vé.</p>
              ) : (
                <div className="space-y-4">
                  {history.purchases.map(order => (
                    <CustomerOrderCard
                      key={order.id}
                      order={order}
                      busy={busy}
                      onCancelTicket={cancelTicket}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4">Lịch sử admin</h3>
              {(history?.actions || []).length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có thao tác admin.</p>
              ) : (
                <div className="space-y-3">
                  {history.actions.map(action => (
                    <div key={action.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-gray-800">
                          {action.action_type === 'added' ? 'Đã thêm vé' : 'Đã hủy vé'} · {action.event_title}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(action.created_at)}</p>
                      </div>
                      <p className="mt-1 text-gray-600">
                        Ghế: {action.zone_name || 'Khu'} {action.seat_label || ''} · Admin: {action.admin_name || action.admin_email}
                      </p>
                      {action.reason && <p className="mt-1 text-gray-500">Ghi chú: {action.reason}</p>}
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

function CustomerOrderCard({ order, busy, onCancelTicket }) {
  const tickets = order.tickets || [];
  const statusLabel = {
    paid: 'Đã mua',
    pending: 'Đang xử lý',
    cancelled: 'Đã hủy',
  }[order.status] || order.status;
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
                  {busy === ticket.ticket_id ? 'Đang hủy...' : 'Hủy'}
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
