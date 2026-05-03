import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'paid', label: 'Thành công' },
  { key: 'pending', label: 'Đang xử lý' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const TIME_FILTERS = [
  { key: 'upcoming', label: 'Sắp diễn ra' },
  { key: 'ended', label: 'Đã kết thúc' },
];

const STATUS_LABELS = {
  paid: 'Thành công',
  pending: 'Đang xử lý',
  cancelled: 'Đã hủy',
};

function formatDate(d) {
  return new Date(d).toLocaleString('vi-VN', {
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
  if (status === 'paid') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (status === 'pending') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-300 border-red-500/30';
}

export default function MyTicketsPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Không thể tải lịch sử vé. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter(order => matchesStatus(order, statusFilter) && matchesTime(order, timeFilter)),
    [orders, statusFilter, timeFilter]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#242528] text-center py-20 text-gray-300">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#242528] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-normal">Vé của tôi</h1>
        <div className="mt-5 border-t border-white/15 pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`h-9 rounded-full text-sm sm:text-base font-bold transition ${
                  statusFilter === filter.key
                    ? 'bg-[#31c878] text-[#111315]'
                    : 'bg-[#686d75] text-[#25272b] hover:bg-[#777c84]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-14">
            {TIME_FILTERS.map(filter => (
              <button
                key={filter.key}
                onClick={() => setTimeFilter(filter.key)}
                className={`pb-2 text-base sm:text-lg font-extrabold transition ${
                  timeFilter === filter.key
                    ? 'text-white border-b-2 border-[#31c878]'
                    : 'text-[#8d99b0] border-b-2 border-transparent hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center">
            <p className="text-gray-300">Không có vé phù hợp.</p>
            <Link to="/" className="mt-3 inline-block text-[#31c878] font-semibold hover:underline">
              Xem sự kiện
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {filteredOrders.map(order => (
              <TicketOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketOrderCard({ order }) {
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
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#2f3136] shadow-xl shadow-black/10">
      <div className="grid gap-0 md:grid-cols-[180px_1fr]">
        <div className="h-44 md:h-full bg-[#1e2024]">
          {order.poster_url ? (
            <img src={order.poster_url} alt={order.event_title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-white/25">🎫</div>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold truncate">{order.event_title}</h2>
              <p className="mt-1 text-sm text-gray-300">📍 {order.venue}</p>
              <p className="mt-1 text-sm text-gray-300">📅 {formatDate(order.event_date)}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${getBadgeClass(status)}`}>
                {STATUS_LABELS[status] || status}
              </span>
              {cancelledItems.length > 0 && order.status !== 'cancelled' && (
                <span className="w-fit rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                  Có vé đã hủy
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {activeItems.length > 0 && (
              <SeatList title="Vé đang hiệu lực" items={activeItems} />
            )}
            {cancelledItems.length > 0 && (
              <SeatList title="Vé đã hủy" items={cancelledItems} cancelled />
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-lg font-extrabold text-[#31c878]">{formatVND(order.total_amount)}</span>
            {order.status === 'paid' && activeItems.length > 0 ? (
              <Link
                to={`/orders/${order.id}/tickets`}
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100"
              >
                Xem vé
              </Link>
            ) : (
              <span className="text-sm text-gray-400">
                {order.status === 'pending' ? 'Đơn đang chờ thanh toán' : 'Đơn đã hủy'}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SeatList({ title, items, cancelled = false }) {
  return (
    <div>
      <p className={`mb-2 text-xs font-bold uppercase ${cancelled ? 'text-red-300' : 'text-gray-400'}`}>
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item.action_id || item.seat_id}
            className={`rounded-lg border px-3 py-1 text-sm font-semibold ${
              cancelled
                ? 'border-red-500/25 bg-red-500/10 text-red-200'
                : 'border-white/10 bg-white/10 text-gray-100'
            }`}
            title={item.reason || ''}
          >
            {item.zone || 'Khu'} {item.label || ''}
          </span>
        ))}
      </div>
    </div>
  );
}
