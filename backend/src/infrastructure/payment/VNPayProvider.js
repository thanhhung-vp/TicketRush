import { config } from '../../config/index.js';

export class VNPayProvider {
  /**
   * Build a VNPay sandbox payment URL.
   * @param {object} order - order record from DB (must have id, total_amount)
   * @param {string} serverUrl - base server URL for IPN callback
   * @param {string} clientUrl - base client URL for return redirect
   * @returns {{ method: string, payment_url: string, amount: number }}
   */
  initiate(order, serverUrl, clientUrl) {
    const amount = Number(order.total_amount);

    const params = new URLSearchParams({
      vnp_Version:    '2.1.0',
      vnp_Command:    'pay',
      vnp_TmnCode:    config.payment.vnpay.tmnCode || 'DEMO',
      vnp_Amount:     String(amount * 100),
      vnp_CurrCode:   'VND',
      vnp_TxnRef:     String(order.id),
      vnp_OrderInfo:  `TicketRush order ${order.id}`,
      vnp_ReturnUrl:  `${clientUrl || config.clientUrl}/payment/return`,
      vnp_CreateDate: new Date().toISOString().replace(/\D/g, '').slice(0, 14),
      vnp_IpAddr:     '127.0.0.1',
      vnp_Locale:     'vn',
      vnp_OrderType:  'billpayment',
    });

    const paymentUrl = `${config.payment.vnpay.url}?${params}`;

    return { method: 'vnpay', payment_url: paymentUrl, amount };
  }

  /**
   * Verify a VNPay IPN / return callback.
   * TODO: implement HMAC-SHA512 verification using config.payment.vnpay.hashSecret in production.
   * @returns {boolean}
   */
  verify(_body) {
    return true;
  }
}
