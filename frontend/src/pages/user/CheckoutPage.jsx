import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/payment.service.js';
import { useAuth } from '../../store/auth.context.jsx';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { formatVND } from '../../utils/format.js';
import { Button, Alert } from '../../components/ui/index.js';

export default function CheckoutPage() {
  const { state }   = useLocation();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [method, setMethod]   = useState('mock');
  const [step, setStep]       = useState('select'); // select | confirm | processing
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const seatIds  = state?.seat_ids  || [];
  const seatInfo = state?.seat_info || [];

  if (!seatIds.length) {
    return (
      <div className="text-center py-24 px-4">
        <div className="text-5xl mb-4">🪑</div>
        <p className="text-gray-400 mb-4">Không có ghế nào được chọn.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  const total = seatInfo.reduce((sum, seat) => sum + Number(seat.price), 0);

  const initiatePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await paymentService.initiate(seatIds, method);
      setOrderId(data.order.id);

      if ((method === 'vnpay' || method === 'momo') && data.payment?.payment_url) {
        window.location.href = data.payment.payment_url;
        return;
      }
      // Mock: proceed to confirm step
      setStep('confirm');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Không thể khởi tạo thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const confirmMockPayment = async () => {
    setStep('processing');
    setError('');
    try {
      const data = await paymentService.confirm(orderId, 'mock');
      navigate(`/orders/${data.order.id}/tickets`, {
        state: { order: data.order, tickets: data.tickets },
      });
    } catch (err) {
      setStep('confirm');
      setError(err.response?.data?.error || err.message || 'Thanh toán thất bại');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Buyer info */}
        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Người mua</p>
          <p className="font-semibold">{user?.full_name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>

        {/* Seat list */}
        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
            Ghế đã chọn ({seatIds.length})
          </p>
          <div className="space-y-2">
            {seatInfo.length > 0 ? (
              seatInfo.map(seat => (
                <div key={seat.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: seat.color || '#3b82f6' }}
                    />
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

        {/* Step: select payment method */}
        {step === 'select' && (
          <>
            <div className="px-6 py-4 border-b border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                Phương thức thanh toán
              </p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(pm => (
                  <label
                    key={pm.value}
                    className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition ${
                      method === pm.value
                        ? 'border-blue-500 bg-blue-950/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={pm.value}
                      checked={method === pm.value}
                      onChange={() => setMethod(pm.value)}
                      className="accent-blue-500"
                    />
                    <span className="text-2xl">{pm.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pm.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pm.badgeColor}`}>
                          {pm.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{pm.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-6 py-3 border-b border-gray-800">
                <Alert type="error">{error}</Alert>
              </div>
            )}

            <div className="px-6 py-4 flex gap-3">
              <Button variant="secondary" onClick={() => navigate(-1)} className="flex-1">
                Quay lại
              </Button>
              <Button onClick={initiatePayment} disabled={loading} className="flex-1">
                {loading ? 'Đang xử lý...' : 'Tiếp tục'}
              </Button>
            </div>
          </>
        )}

        {/* Step: mock confirm */}
        {step === 'confirm' && (
          <>
            <div className="px-6 py-4 border-b border-gray-800 bg-yellow-950/20">
              <p className="text-sm text-yellow-300">
                Demo mode: Nhấn <strong>Xác nhận</strong> để giả lập thanh toán thành công.
              </p>
            </div>

            {error && (
              <div className="px-6 py-3 border-b border-gray-800">
                <Alert type="error">{error}</Alert>
              </div>
            )}

            <div className="px-6 py-4 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => { setStep('select'); setOrderId(null); }}
                className="flex-1"
              >
                Đổi phương thức
              </Button>
              <Button
                variant="success"
                onClick={confirmMockPayment}
                className="flex-1"
              >
                Xác nhận thanh toán
              </Button>
            </div>
          </>
        )}

        {/* Step: processing */}
        {step === 'processing' && (
          <div className="px-6 py-12 flex flex-col items-center gap-4 text-gray-400">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Đang xử lý thanh toán…</p>
          </div>
        )}
      </div>
    </div>
  );
}
