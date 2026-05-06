import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
}

export default function CheckoutPage() {
  const { state }     = useLocation();
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const { t }         = useTranslation();

  const PAYMENT_METHODS = [
    {
      value: 'mock',
      label: t('checkout.mock.label'),
      desc: t('checkout.mock.desc'),
      icon: '💳',
      badge: 'Demo',
      badgeColor: 'bg-gray-100 text-gray-600',
    },
    {
      value: 'vnpay',
      label: t('checkout.vnpay.label'),
      desc: t('checkout.vnpay.desc'),
      icon: '🏦',
      badge: 'Sandbox',
      badgeColor: 'bg-blue-50 text-blue-600',
    },
    {
      value: 'momo',
      label: t('checkout.momo.label'),
      desc: t('checkout.momo.desc'),
      icon: '📱',
      badge: 'Sandbox',
      badgeColor: 'bg-pink-50 text-pink-600',
    },
  ];

  const [method, setMethod]   = useState('mock');
  const [step, setStep]       = useState('select');
  const [orderId, setOrderId] = useState(state?.order_id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [merch, setMerch]     = useState([]);
  const [cart, setCart]       = useState({});

  const seatIds  = state?.seat_ids  || [];
  const seatInfo = state?.seat_info || [];
  const eventId  = state?.event_id  || seatInfo[0]?.event_id;

  useEffect(() => {
    if (!eventId) return;
    api.get(`/merchandise/${eventId}`)
      .then(r => setMerch(r.data.filter(m => m.stock > 0)))
      .catch(() => {});
  }, [eventId]);

  if (!seatIds.length) {
    return (
      <div className="text-center py-20 text-gray-400">
        {t('checkout.noSeats')}{' '}
        <button onClick={() => navigate('/')} className="text-primary underline">{t('checkout.goHome')}</button>
      </div>
    );
  }

  const seatTotal = seatInfo.reduce((s, seat) => s + Number(seat.price), 0);
  const merchTotal = merch.reduce((s, m) => s + (cart[m.id] || 0) * Number(m.price), 0);
  const total = seatTotal + merchTotal;

  const setQty = (id, delta) => {
    const item = merch.find(m => m.id === id);
    if (!item) return;
    setCart(c => {
      const cur = c[id] || 0;
      const next = Math.max(0, Math.min(item.stock, cur + delta));
      if (next === 0) { const { [id]: _, ...rest } = c; return rest; }
      return { ...c, [id]: next };
    });
  };

  const cartItems = merch
    .filter(m => cart[m.id])
    .map(m => ({ merch_id: m.id, quantity: cart[m.id], price: m.price, name: m.name }));

  const initiatePayment = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/payment/initiate', {
        seat_ids: seatIds,
        method,
        merch_items: cartItems.map(({ merch_id, quantity }) => ({ merch_id, quantity })),
      });
      setOrderId(data.order.id);

      if (method === 'vnpay' && data.payment.payment_url) {
        window.location.href = data.payment.payment_url;
        return;
      }
      if (method === 'momo' && data.payment.payment_url) {
        window.location.href = data.payment.payment_url;
        return;
      }
      setStep('confirm');
    } catch (err) {
      setError(err.response?.data?.error || t('checkout.initiationFailed'));
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
      setError(err.response?.data?.error || t('checkout.paymentFailed'));
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">{t('checkout.title')}</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Buyer */}
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{t('checkout.buyer')}</p>
          <p className="font-semibold text-gray-900">{user?.full_name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        {/* Seats */}
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
            {t('checkout.selectedSeats')} ({seatIds.length})
          </p>
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
              <p className="text-sm text-gray-400">{t('checkout.seatsCount', { count: seatIds.length })}</p>
            )}
          </div>
        </div>

        {/* Merchandise */}
        {merch.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">{t('checkout.addMerch')}</p>
            <div className="space-y-3">
              {merch.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  {m.image_url ? (
                    <img src={m.image_url} alt={m.name} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🎁</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-primary font-semibold">{formatVND(m.price)}</p>
                    {m.description && <p className="text-xs text-gray-400 truncate">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setQty(m.id, -1)}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:border-primary hover:text-primary transition text-sm font-bold"
                    >−</button>
                    <span className="w-5 text-center text-sm font-medium">{cart[m.id] || 0}</span>
                    <button
                      onClick={() => setQty(m.id, 1)}
                      disabled={(cart[m.id] || 0) >= m.stock}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:border-primary hover:text-primary transition text-sm font-bold disabled:opacity-40"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-600">
                <span>{t('checkout.merchandiseLabel')}</span>
                <span className="font-medium">{formatVND(merchTotal)}</span>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-gray-900">{t('checkout.total')}</span>
          <span className="text-xl font-bold text-green-600">{formatVND(total)}</span>
        </div>

        {/* Payment method selection */}
        {step === 'select' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">{t('checkout.methodLabel')}</p>
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
                {t('checkout.back')}
              </button>
              <button onClick={initiatePayment} disabled={loading}
                className="flex-1 bg-[#E6007E] hover:bg-[#c4006a] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
                {loading ? t('checkout.processing') : t('checkout.continueBtn')}
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
                <span dangerouslySetInnerHTML={{ __html: t('checkout.demoWarning') }} />
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
                {t('checkout.changeMethod')}
              </button>
              <button onClick={confirmMockPayment}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition">
                {t('checkout.confirmPayment')}
              </button>
            </div>
          </>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="px-6 py-10 flex flex-col items-center gap-3 text-gray-400">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p>{t('checkout.processingPayment')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
