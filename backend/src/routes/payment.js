import crypto from 'crypto';
import { Router } from 'express';
import QRCode from 'qrcode';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendOrderConfirmation } from '../services/email.js';
import { createOrReusePendingOrderForSeats } from '../utils/pendingHoldOrders.js';

const router = Router();

// ── Supported payment methods ──────────────────────────────
const METHODS = ['mock', 'vnpay', 'momo'];

/**
 * POST /payment/initiate
 * Body: { seat_ids, method }
 * Creates a pending order and returns a payment URL / instructions.
 */
router.post('/initiate', authenticate, async (req, res) => {
  const { seat_ids, method = 'mock' } = req.body;
  if (!Array.isArray(seat_ids) || !seat_ids.length) {
    return res.status(400).json({ error: 'seat_ids required' });
  }
  if (!METHODS.includes(method)) {
    return res.status(400).json({ error: `method must be one of: ${METHODS.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const placeholders = seat_ids.map((_, i) => `$${i + 2}`).join(',');
    const { rows: seats } = await client.query(
      `SELECT s.id, s.status, s.locked_by, s.locked_until, s.event_id, z.price,
              (s.locked_until IS NULL OR s.locked_until > NOW()) AS hold_active
       FROM seats s JOIN zones z ON z.id = s.zone_id
       WHERE s.id IN (${placeholders}) AND s.locked_by = $1
       FOR UPDATE`,
      [req.user.id, ...seat_ids]
    );

    if (seats.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Seats not found or not held by you' });
    }
    if (seats.some(s => s.status !== 'locked' || !s.hold_active)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Some seats are no longer locked (hold may have expired)' });
    }

    const eventId = seats[0].event_id;
    const order = await createOrReusePendingOrderForSeats(client, {
      userId: req.user.id,
      eventId,
      seats,
    });

    await client.query('COMMIT');

    // Build method-specific response
    const paymentData = buildPaymentData(method, order, req.user);
    res.status(201).json({ order, payment: paymentData });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /payment/confirm
 * Body: { order_id, method, transaction_id? }
 * Confirms payment and issues tickets.
 * In production, this endpoint is called after VNPay/MoMo IPN verification.
 */
router.post('/confirm', authenticate, async (req, res) => {
  const { order_id, method = 'mock', transaction_id } = req.body;
  if (!order_id) return res.status(400).json({ error: 'order_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orders } = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = 'pending' FOR UPDATE`,
      [order_id, req.user.id]
    );
    if (!orders[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending order not found' });
    }
    const order = orders[0];

    // For mock: always succeed. For real methods: verify IPN hash first.
    if (method !== 'mock') {
      const verified = verifyPayment(method, req.body);
      if (!verified) {
        await client.query('ROLLBACK');
        return res.status(402).json({ error: 'Payment verification failed' });
      }
    }

    const { rows: items } = await client.query(
      `SELECT oi.seat_id, oi.price, s.status, s.locked_by, s.locked_until, s.event_id,
              (s.locked_until IS NULL OR s.locked_until > NOW()) AS hold_active
       FROM order_items oi
       JOIN seats s ON s.id = oi.seat_id
       WHERE oi.order_id = $1
       FOR UPDATE OF s`,
      [order_id]
    );

    const invalidItems = items.filter(item =>
      item.status !== 'locked' ||
      item.locked_by !== req.user.id ||
      !item.hold_active
    );
    if (items.length === 0 || invalidItems.length > 0) {
      await client.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [order_id]);
      await client.query('COMMIT');
      return res.status(409).json({ error: 'Some seats are no longer locked (hold may have expired)' });
    }

    // Mark seats sold
    const seatIds = items.map(i => i.seat_id);
    const sp = seatIds.map((_, i) => `$${i + 2}`).join(',');
    const { rowCount: soldCount } = await client.query(
      `UPDATE seats
       SET status='sold', locked_by=NULL, locked_at=NULL, locked_until=NULL
       WHERE locked_by = $1
         AND status = 'locked'
         AND id IN (${sp})`,
      [req.user.id, ...seatIds]
    );
    if (soldCount !== seatIds.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Some seats could not be finalized' });
    }

    // Update order
    await client.query(
      `UPDATE orders SET status='paid', paid_at=NOW() WHERE id = $1`,
      [order_id]
    );

    // Issue tickets
    const tickets = [];
    for (const item of items) {
      const payload = JSON.stringify({ order_id, seat_id: item.seat_id, user_id: req.user.id });
      const qr = await QRCode.toDataURL(payload);
      const { rows: ticketRows } = await client.query(
        `INSERT INTO tickets (order_id, seat_id, user_id, qr_code) VALUES ($1,$2,$3,$4) RETURNING *`,
        [order_id, item.seat_id, req.user.id, qr]
      );
      tickets.push(ticketRows[0]);
    }

    await client.query('COMMIT');

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`event:${order.event_id}`).emit('seats:updated',
        seatIds.map(id => ({ id, event_id: order.event_id, status: 'sold' }))
      );
    }

    // Send confirmation email (non-blocking)
    try {
      const { rows: eventRows } = await pool.query(
        `SELECT e.title, e.venue, e.event_date,
                u.email, u.full_name
         FROM events e, users u
         WHERE e.id = $1 AND u.id = $2`,
        [order.event_id, req.user.id]
      );
      if (eventRows[0]) {
        const { rows: ticketDetails } = await pool.query(
          `SELECT s.label AS seat_label, z.name AS zone_name
           FROM tickets t
           JOIN seats s ON s.id = t.seat_id
           JOIN zones z ON z.id = s.zone_id
           WHERE t.order_id = $1`,
          [order_id]
        );
        const ev = eventRows[0];
        sendOrderConfirmation({
          to: ev.email,
          full_name: ev.full_name,
          event_title: ev.title,
          event_date: ev.event_date,
          venue: ev.venue,
          tickets: ticketDetails,
          total_amount: order.total_amount,
        });
      }
    } catch { /* email errors are non-fatal */ }

    res.json({ order: { ...order, status: 'paid' }, tickets });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /payment/cancel
 * Cancel pending order and release seats.
 */
router.post('/cancel', authenticate, async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.status(400).json({ error: 'order_id required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: orders } = await client.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status = 'pending' FOR UPDATE`,
      [order_id, req.user.id]
    );
    if (!orders[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending order not found' });
    }
    const order = orders[0];

    const { rows: items } = await client.query(
      'SELECT seat_id FROM order_items WHERE order_id = $1', [order_id]
    );
    const seatIds = items.map(i => i.seat_id);
    let releasedSeatIds = [];
    if (seatIds.length) {
      const sp = seatIds.map((_, i) => `$${i + 2}`).join(',');
      const { rows: releasedSeats } = await client.query(
        `UPDATE seats
         SET status='available', locked_by=NULL, locked_at=NULL, locked_until=NULL
         WHERE locked_by = $1
           AND status = 'locked'
           AND id IN (${sp})
         RETURNING id`,
        [req.user.id, ...seatIds]
      );
      releasedSeatIds = releasedSeats.map(seat => seat.id);
    }

    await client.query(`UPDATE orders SET status='cancelled' WHERE id = $1`, [order_id]);
    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io && releasedSeatIds.length > 0) {
      io.to(`event:${order.event_id}`).emit('seats:updated',
        releasedSeatIds.map(id => ({ id, event_id: order.event_id, status: 'available' }))
      );
    }

    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /payment/vnpay/ipn  — VNPay IPN callback (production)
 * POST /payment/momo/ipn   — MoMo IPN callback (production)
 */
router.post('/vnpay/ipn', (req, res) => {
  // In production: validate VNPay signature, then call /payment/confirm
  const { vnp_ResponseCode, vnp_TxnRef, vnp_SecureHash } = req.body;
  if (vnp_ResponseCode === '00') {
    // Payment success: trigger confirm logic
    res.json({ RspCode: '00', Message: 'Confirm Success' });
  } else {
    res.json({ RspCode: '01', Message: 'Order Not Found' });
  }
});

router.post('/momo/ipn', (req, res) => {
  const { resultCode, orderId, signature } = req.body;
  if (resultCode === 0) {
    res.json({ status: 200, message: 'Success' });
  } else {
    res.json({ status: 400, message: 'Failed' });
  }
});

// ── Helpers ───────────────────────────────────────────────

function buildPaymentData(method, order, user) {
  const amount = Number(order.total_amount);

  if (method === 'mock') {
    return {
      method: 'mock',
      instruction: 'Click "Confirm Payment" to complete (demo mode)',
      amount,
    };
  }

  if (method === 'vnpay') {
    // Production: build actual VNPay payment URL with HMAC-SHA512 signature
    const vnpUrl = buildVNPayUrl(order, amount);
    return { method: 'vnpay', payment_url: vnpUrl, amount };
  }

  if (method === 'momo') {
    const momoData = buildMoMoRequest(order, amount, user);
    return { method: 'momo', ...momoData, amount };
  }
}

function buildVNPayUrl(order, amount) {
  // Stub — replace with real VNPay SDK in production
  const params = new URLSearchParams({
    vnp_Version:    '2.1.0',
    vnp_Command:    'pay',
    vnp_TmnCode:    process.env.VNPAY_TMN_CODE || 'DEMO',
    vnp_Amount:     String(amount * 100),
    vnp_CurrCode:   'VND',
    vnp_TxnRef:     order.id,
    vnp_OrderInfo:  `TicketRush order ${order.id}`,
    vnp_ReturnUrl:  `${process.env.CLIENT_URL}/payment/return`,
    vnp_CreateDate: new Date().toISOString().replace(/\D/g, '').slice(0, 14),
    vnp_IpAddr:     '127.0.0.1',
    vnp_Locale:     'vn',
    vnp_OrderType:  'billpayment',
  });
  return `${process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'}?${params}`;
}

function buildMoMoRequest(order, amount, user) {
  const requestId = `momo-${order.id}`;
  const rawHash = [
    `accessKey=${process.env.MOMO_ACCESS_KEY || 'demo'}`,
    `amount=${amount}`,
    `extraData=`,
    `ipnUrl=${process.env.SERVER_URL || 'http://localhost:4000'}/api/payment/momo/ipn`,
    `orderId=${order.id}`,
    `orderInfo=TicketRush order ${order.id}`,
    `partnerCode=${process.env.MOMO_PARTNER_CODE || 'DEMO'}`,
    `redirectUrl=${process.env.CLIENT_URL}/payment/return`,
    `requestId=${requestId}`,
    `requestType=captureWallet`,
  ].join('&');

  const signature = crypto
    .createHmac('sha256', process.env.MOMO_SECRET_KEY || 'demo-secret')
    .update(rawHash)
    .digest('hex');

  return {
    partner_code: process.env.MOMO_PARTNER_CODE || 'DEMO',
    request_id:   requestId,
    order_id:     order.id,
    signature,
    payment_url:  process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  };
}

function verifyPayment(method, body) {
  if (method === 'vnpay') {
    // TODO: verify HMAC-SHA512 signature with VNPAY_HASH_SECRET
    return true;
  }
  if (method === 'momo') {
    // TODO: verify HMAC-SHA256 signature with MOMO_SECRET_KEY
    return true;
  }
  return false;
}

export default router;
