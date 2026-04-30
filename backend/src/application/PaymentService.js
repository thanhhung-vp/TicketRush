import QRCode from 'qrcode';
import pool from '../infrastructure/database/pool.js';
import { OrderRepository } from '../infrastructure/database/repositories/OrderRepository.js';
import { SeatRepository } from '../infrastructure/database/repositories/SeatRepository.js';
import { TicketRepository } from '../infrastructure/database/repositories/TicketRepository.js';
import { getPaymentProvider } from '../infrastructure/payment/PaymentProviderFactory.js';
import { NotFoundError, ConflictError, PaymentError } from '../domain/errors/AppError.js';
import { config } from '../config/index.js';

const orderRepo  = new OrderRepository();
const seatRepo   = new SeatRepository();
const ticketRepo = new TicketRepository();

export class PaymentService {
  constructor(io) { this.io = io; }

  async initiate(userId, seatIds, method) {
    const provider = getPaymentProvider(method);
    const client   = await pool.connect();
    try {
      await client.query('BEGIN');
      const seats = await seatRepo.findByIds(client, seatIds, userId);

      if (seats.length !== seatIds.length) throw new ConflictError('Seats not found or not held by you');
      if (seats.some(s => s.status !== 'locked')) throw new ConflictError('Some seats are no longer locked');

      const eventId = seats[0].event_id;
      const total   = seats.reduce((s, seat) => s + Number(seat.price), 0);
      const order   = await orderRepo.create(client, { userId, eventId, totalAmount: total, status: 'pending' });
      await orderRepo.createItems(client, order.id, seats);
      await client.query('COMMIT');

      const paymentData = await provider.initiate(order, config.serverUrl, config.clientUrl);
      return { order, payment: paymentData };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async confirm(userId, orderId, method, body = {}) {
    const provider = getPaymentProvider(method);
    if (method !== 'mock') {
      const ok = await provider.verify(body);
      if (!ok) throw new PaymentError('Payment verification failed');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const order = await orderRepo.findPendingByIdAndUser(client, orderId, userId);
      if (!order) throw new NotFoundError('Pending order');

      const items   = await orderRepo.getItems(orderId);
      const seatIds = items.map(i => i.seat_id);

      await seatRepo.markSold(client, seatIds);
      await orderRepo.markPaid(client, orderId);

      const tickets = [];
      for (const item of items) {
        const payload = JSON.stringify({ order_id: orderId, seat_id: item.seat_id, user_id: userId });
        const qr = await QRCode.toDataURL(payload);
        const ticket = await ticketRepo.create(client, {
          orderId, seatId: item.seat_id, userId, qrCode: qr,
        });
        tickets.push(ticket);
      }

      await client.query('COMMIT');

      if (this.io) {
        this.io.to(`event:${order.event_id}`).emit('seats:updated',
          seatIds.map(id => ({ id, event_id: order.event_id, status: 'sold' }))
        );
      }

      return { order: { ...order, status: 'paid' }, tickets };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancel(userId, orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const order = await orderRepo.findPendingByIdAndUser(client, orderId, userId);
      if (!order) throw new NotFoundError('Pending order');

      const items   = await orderRepo.getItems(orderId);
      const seatIds = items.map(i => i.seat_id);
      if (seatIds.length) await seatRepo.releaseSeats(client, seatIds, userId);
      await orderRepo.markCancelled(client, orderId);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
