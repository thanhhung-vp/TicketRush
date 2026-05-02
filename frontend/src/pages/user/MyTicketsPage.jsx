import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { formatVND, formatDate } from '../../utils/format.js';
import { PageSpinner, Alert, Badge } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';

export default function MyTicketsPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    orderService.myOrders()
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải danh sách đơn hàng.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <PageContainer maxWidth="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vé của tôi</h1>
        <Link
          to="/"
          className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition"
        >
          Khám phá sự kiện
        </Link>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {orders.length === 0 && !error ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🎟</div>
          <p className="text-gray-400 text-lg mb-2">Bạn chưa có đơn hàng nào.</p>
          <Link
            to="/"
            className="mt-3 inline-block text-blue-400 hover:text-blue-300 hover:underline text-sm transition"
          >
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
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base leading-snug truncate">
            {order.event_title}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {order.venue}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(order.event_date)}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium bg-green-900/40 text-green-400 border border-green-800">
          Đã thanh toán
        </span>
      </div>

      {/* Seats + total + link */}
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {order.items?.map(item => (
            <span
              key={item.seat_id}
              className="text-xs bg-gray-800 border border-gray-700 px-2 py-0.5 rounded font-mono"
            >
              {item.zone} {item.label}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <span className="font-bold text-blue-400 text-sm">
            {formatVND(order.total_amount)}
          </span>
          <Link
            to={`/orders/${order.id}/tickets`}
            className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition font-medium"
          >
            Xem vé
          </Link>
        </div>
      </div>
    </div>
  );
}
