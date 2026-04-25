import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
}

export default function CheckoutPage() {
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const seatIds  = state?.seat_ids  || [];
  const seatInfo = state?.seat_info || [];

  if (!seatIds.length) {
    return (
      <div className="text-center py-20 text-gray-400">
        Không có ghế nào để thanh toán.{' '}
        <button onClick={() => navigate('/')} className="text-blue-400 underline">Về trang chủ</button>
      </div>
    );
  }

  const total = seatInfo.reduce((s, seat) => s + Number(seat.price), 0);

  const handleConfirm = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/orders/checkout', { seat_ids: seatIds });
      navigate(`/orders/${data.order.id}/tickets`, {
        state: { order: data.order, tickets: data.tickets },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Thanh toán thất bại, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Xác nhận thanh toán</h1>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Buyer info */}
        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Người mua</p>
          <p className="font-semibold">{user?.full_name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>

        {/* Seat list */}
        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
            Ghế đã chọn ({seatIds.length} ghế)
          </p>
          <div className="space-y-2">
            {seatInfo.length > 0 ? (
              seatInfo.map(seat => (
                <div key={seat.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: seat.color || '#3b82f6' }} />
                    <span className="font-medium">{seat.label}</span>
                    <span className="text-gray-500">({seat.zone_name})</span>
                  </span>
                  <span className="text-blue-400 font-medium">{formatVND(seat.price)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">{seatIds.length} ghế đã chọn</p>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <span className="font-semibold">Tổng cộng</span>
          <span className="text-xl font-bold text-green-400">{formatVND(total)}</span>
        </div>

        {/* Note */}
        <div className="px-6 py-4 border-b border-gray-800 bg-yellow-950/20">
          <p className="text-sm text-yellow-300 flex items-start gap-2">
            <span>⚠️</span>
            <span>Đây là giao dịch mô phỏng. Nhấn <strong>"Xác nhận"</strong> để hoàn tất thanh toán và nhận vé điện tử.</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 bg-red-950/30 border-b border-red-900/50">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 py-3 rounded-xl transition font-medium"
          >
            Quay lại
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : '✓ Xác nhận thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
}
