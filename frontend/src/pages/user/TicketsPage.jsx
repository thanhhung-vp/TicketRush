import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { orderService } from '../../services/order.service.js';
import { TicketCard } from '../../components/features/tickets/TicketCard.jsx';
import { PageSpinner, Alert } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';

export default function TicketsPage() {
  const { orderId } = useParams();
  const { state }   = useLocation();

  const [tickets, setTickets] = useState(state?.tickets || []);
  const [loading, setLoading] = useState(!state?.tickets);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!state?.tickets) {
      orderService.getTickets(orderId)
        .then(data => setTickets(Array.isArray(data) ? data : []))
        .catch(() => setError('Không thể tải vé. Vui lòng thử lại.'))
        .finally(() => setLoading(false));
    }
  }, [orderId, state?.tickets]);

  if (loading) return <PageSpinner />;

  return (
    <PageContainer maxWidth="max-w-2xl">
      {/* Success header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="text-3xl font-bold mb-2">Đặt vé thành công!</h1>
        <p className="text-gray-400">
          {tickets.length > 0
            ? `${tickets.length} vé điện tử đã sẵn sàng — lưu QR để vào cổng.`
            : 'Vé của bạn đang được xử lý.'}
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Ticket list */}
      {tickets.length > 0 && (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Navigation links */}
      <div className="mt-10 flex flex-col items-center gap-3 text-sm">
        <Link
          to="/my-tickets"
          className="text-blue-400 hover:text-blue-300 hover:underline transition font-medium"
        >
          Xem tất cả vé của tôi
        </Link>
        <Link
          to="/"
          className="text-gray-500 hover:text-gray-300 transition"
        >
          Khám phá sự kiện khác
        </Link>
      </div>
    </PageContainer>
  );
}
