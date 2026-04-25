import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

function formatDate(d) {
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function MyTicketsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Vé của tôi</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Bạn chưa có đơn hàng nào.{' '}
          <Link to="/" className="text-blue-400 underline">Xem sự kiện</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg">{order.event_title}</h2>
                  <p className="text-sm text-gray-400">📍 {order.venue}</p>
                  <p className="text-sm text-gray-400">📅 {formatDate(order.event_date)}</p>
                </div>
                <span className="bg-green-900/40 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full border border-green-800">
                  Đã thanh toán
                </span>
              </div>
              <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {order.items?.map(i => (
                    <span key={i.seat_id} className="mr-2 bg-gray-800 px-2 py-0.5 rounded">
                      {i.zone} {i.label}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-blue-400">{formatVND(order.total_amount)}</span>
                  <Link to={`/orders/${order.id}/tickets`}
                    className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition">
                    Xem vé →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
