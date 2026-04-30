import crypto from 'crypto';
import { config } from '../../config/index.js';

export class MoMoProvider {
  /**
   * Build a MoMo payment request.
   * @param {object} order  - order record from DB (must have id, total_amount)
   * @param {object} user   - authenticated user (has id, email)
   * @param {string} serverUrl - base server URL for IPN callback
   * @param {string} clientUrl - base client URL for redirect
   * @returns {{ method: string, payment_url: string, partner_code: string, request_id: string, order_id: string|number, signature: string, amount: number }}
   */
  initiate(order, user, serverUrl, clientUrl) {
    const amount     = Number(order.total_amount);
    const requestId  = `momo-${order.id}`;
    const partnerCode = config.payment.momo.partnerCode || 'DEMO';
    const accessKey   = config.payment.momo.accessKey   || 'demo';
    const secretKey   = config.payment.momo.secretKey   || 'demo-secret';
    const endpoint    = config.payment.momo.endpoint;

    const ipnUrl      = `${serverUrl || config.serverUrl}/api/payment/momo/ipn`;
    const redirectUrl = `${clientUrl || config.clientUrl}/payment/return`;

    const rawHash = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${order.id}`,
      `orderInfo=TicketRush order ${order.id}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=captureWallet`,
    ].join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawHash)
      .digest('hex');

    return {
      method:       'momo',
      payment_url:  endpoint,
      partner_code: partnerCode,
      request_id:   requestId,
      order_id:     order.id,
      signature,
      amount,
    };
  }

  /**
   * Verify a MoMo IPN / return callback.
   * TODO: implement HMAC-SHA256 verification using config.payment.momo.secretKey in production.
   * @returns {boolean}
   */
  verify(_body) {
    return true;
  }
}
