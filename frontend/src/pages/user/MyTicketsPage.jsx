import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { orderService } from '../../services/order.service.js';
import { formatVND, formatDate } from '../../utils/format.js';
import { PageSpinner, Alert } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';

export default function MyTicketsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    orderService.myOrders()
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải danh sách đơn hàng.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <PageContainer maxWidth="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vé của tôi</h1>
        <Link to="/" className="text-sm text-accent transition hover:underline">
          Khám phá sự kiện
        </Link>
      </div>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}

      {orders.length === 0 && !error ? (
        <div className="py-24 text-center">
          <Ticket className="mx-auto mb-4 h-14 w-14 text-label-tertiary" aria-hidden="true" />
          <p className="mb-2 text-lg text-label-secondary">Bạn chưa có đơn hàng nào.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-accent transition hover:underline">
            Tìm sự kiện ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function OrderCard({ order }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-1 transition hover:border-info hover:shadow-2">
      <div className="flex items-start justify-between gap-4 border-b border-separator px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-snug text-label-primary">{order.event_title}</h2>
          <p className="mt-0.5 text-sm text-label-secondary">{order.venue}</p>
          <p className="mt-0.5 text-sm text-label-tertiary">{formatDate(order.event_date)}</p>
        </div>
        <span className="flex-shrink-0 rounded-full border border-success bg-success-tint px-2.5 py-1 text-xs font-medium text-success">
          Đã thanh toán
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {order.items?.map(item => (
            <span key={item.seat_id} className="rounded border border-separator bg-fill-tertiary px-2 py-0.5 font-mono text-xs">
              {item.zone} {item.label}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm font-bold text-info">{formatVND(order.total_amount)}</span>
          <Link
            to={`/orders/${order.id}/tickets`}
            className="rounded-lg border border-separator bg-fill-tertiary px-3 py-1.5 text-sm font-medium transition hover:bg-fill-quaternary"
          >
            Xem vé
          </Link>
        </div>
      </div>
    </div>
  );
}
