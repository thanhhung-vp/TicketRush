import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
}

const PAYMENT_METHODS = [
  {
    value: 'mock',
    label: 'Thanh toán mô phỏng',
    desc: 'Dùng cho demo / kiểm thử',
    icon: '💳',
    badge: 'Demo',
    badgeColor: 'bg-gray-100 text-gray-600',
  },
  {
    value: 'vnpay',
    label: 'VNPay',
    desc: 'Thanh toán qua VNPay Gateway',
    icon: '🏦',
    badge: 'Sandbox',
    badgeColor: 'bg-blue-50 text-blue-600',
  },
  {
    value: 'momo',
    label: 'MoMo',
    desc: 'Ví điện tử MoMo',
    icon: '📱',
    badge: 'Sandbox',
    badgeColor: 'bg-pink-50 text-pink-600',
  },
];

export default function CheckoutPage() {
  const { state }     = useLocation();
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const [method, setMethod]   = useState('mock');
  const [step, setStep]       = useState('select'); // select | confirm | processing
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const seatIds  = state?.seat_ids  || [];
  const seatInfo = state?.seat_info || [];

  if (!seatIds.length) {
    return (
      <div className="text-center py-20 text-gray-400">
        Không có ghế nào.{' '}
        <button onClick={() => navigate('/')} className="text-primary underline">Về trang chủ</button>
      </div>
    );
  }

  const total = seatInfo.reduce((s, seat) => s + Number(seat.price), 0);

  const initiatePayment = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/payment/initiate', { seat_ids: seatIds, method });
      setOrderId(data.order.id);

      if (method === 'vnpay' && data.payment.payment_url) {
        window.location.href = data.payment.payment_url;
        return;
      }
      if (method === 'momo' && data.payment.payment_url) {
        window.location.href = data.payment.payment_url;
        return;
      }
      // Mock: go to confirm step
      setStep('confirm');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể khởi tạo thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const confirmMockPayment = async () => {
    setStep('processing'); setError('');
    try {
      const { data } = await api.post('/payment/confirm', { order_id: orderId, method: 'mock' });
      navigate(`/orders/${data.order.id}/tickets`, {
        state: { order: data.order, tickets: data.tickets },
      });
    } catch (err) {
      setStep('confirm');
      setError(err.response?.data?.error || 'Thanh toán thất bại');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Thanh toán</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Buyer */}
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Người mua</p>
          <p className="font-semibold text-gray-900">{user?.full_name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        {/* Seats */}
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Ghế đã chọn ({seatIds.length})</p>
          <div className="space-y-2">
            {seatInfo.length > 0 ? seatInfo.map(seat => (
              <div key={seat.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seat.color || '#3b82f6' }} />
                  <span className="font-medium text-gray-800">{seat.label}</span>
                  <span className="text-gray-400">({seat.zone_name})</span>
                </span>
                <span className="text-primary font-medium">{formatVND(seat.price)}</span>
              </div>
            )) : (
              <p className="text-sm text-gray-400">{seatIds.length} ghế đã chọn</p>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Tổng cộng</span>
          <span className="text-xl font-bold text-green-600">{formatVND(total)}</span>
        </div>

        {/* Payment method selection */}
        {step === 'select' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Phương thức thanh toán</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(pm => (
                  <label key={pm.value}
                    className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition ${
                      method === pm.value
                        ? 'border-primary bg-pink-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="radio" name="method" value={pm.value}
                      checked={method === pm.value}
                      onChange={() => setMethod(pm.value)}
                      className="accent-primary" />
                    <span className="text-2xl">{pm.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{pm.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pm.badgeColor}`}>
                          {pm.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{pm.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                <p className="text-red-600 text-sm">❌ {error}</p>
              </div>
            )}

            <div className="px-6 py-4 flex gap-3">
              <button onClick={() => navigate(-1)}
                className="flex-1 border border-gray-300 text-gray-600 hover:text-gray-900 py-3 rounded-xl transition">
                Quay lại
              </button>
              <button onClick={initiatePayment} disabled={loading}
                className="flex-1 bg-primary hover:bg-pink-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? 'Đang xử lý...' : 'Tiếp tục →'}
              </button>
            </div>
          </>
        )}

        {/* Mock confirm step */}
        {step === 'confirm' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
              <p className="text-sm text-yellow-700 flex gap-2">
                <span>⚠️</span>
                <span>Demo mode: Nhấn <strong>"Xác nhận"</strong> để giả lập thanh toán thành công.</span>
              </p>
            </div>
            {error && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                <p className="text-red-600 text-sm">❌ {error}</p>
              </div>
            )}
            <div className="px-6 py-4 flex gap-3">
              <button onClick={() => { setStep('select'); setOrderId(null); }}
                className="flex-1 border border-gray-300 text-gray-600 hover:text-gray-900 py-3 rounded-xl transition">
                Đổi phương thức
              </button>
              <button onClick={confirmMockPayment}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition">
                ✓ Xác nhận thanh toán
              </button>
            </div>
          </>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="px-6 py-10 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p>Đang xử lý thanh toán…</p>
          </div>
        )}
      </div>
    </div>
  );
}
