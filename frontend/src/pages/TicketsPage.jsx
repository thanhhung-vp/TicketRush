import { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import api from '../lib/api.js';

function formatDate(d) {
  return new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TicketsPage() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const [tickets, setTickets] = useState(state?.tickets || []);
  const [loading, setLoading] = useState(!state?.tickets);

  useEffect(() => {
    if (!state?.tickets) {
      api.get(`/orders/${orderId}/tickets`).then(r => setTickets(r.data)).finally(() => setLoading(false));
    }
  }, [orderId]);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải vé...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold">Đặt vé thành công!</h1>
        <p className="text-gray-400 mt-1">Vé điện tử của bạn đã sẵn sàng</p>
      </div>

      <div className="space-y-4">
        {tickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-blue-400 hover:text-blue-300 underline text-sm">
          ← Khám phá sự kiện khác
        </Link>
      </div>
    </div>
  );
}

function TicketCard({ ticket }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-6 py-4 border-b border-gray-800">
        <h2 className="font-bold text-lg">{ticket.event_title}</h2>
        <p className="text-sm text-gray-400">📍 {ticket.venue}</p>
        <p className="text-sm text-gray-400">📅 {formatDate(ticket.event_date)}</p>
      </div>
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Khu / Ghế</p>
          <p className="font-bold text-xl">{ticket.zone} — {ticket.label}</p>
          <p className="text-xs text-gray-600 mt-1">ID: {ticket.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <button
          onClick={() => setFlipped(f => !f)}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-2 transition"
          title="Xem QR code"
        >
          {flipped ? (
            <img src={ticket.qr_code} alt="QR" className="w-24 h-24" />
          ) : (
            <div className="w-24 h-24 flex flex-col items-center justify-center text-gray-400">
              <span className="text-3xl">📱</span>
              <span className="text-xs mt-1">Xem QR</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
