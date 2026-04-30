import QRCode from 'qrcode';
import pool from '../infrastructure/database/pool.js';
import { OrderRepository } from '../infrastructure/database/repositories/OrderRepository.js';
import { SeatRepository } from '../infrastructure/database/repositories/SeatRepository.js';
import { TicketRepository } from '../infrastructure/database/repositories/TicketRepository.js';
import { NotFoundError, ConflictError } from '../domain/errors/AppError.js';

const orderRepo  = new OrderRepository();
const seatRepo   = new SeatRepository();
const ticketRepo = new TicketRepository();

export class OrderService {
  constructor(io) { this.io = io; }

  async getMyOrders(userId) {
    return orderRepo.findByUser(userId);
  }

  async getTickets(orderId, userId) {
    return ticketRepo.findByOrder(orderId, userId);
  }

  /** Direct checkout (legacy — no payment provider step). */
  async checkout(userId, seatIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const seats = await seatRepo.findByIds(client, seatIds, userId);

      if (seats.length !== seatIds.length) {
        throw new ConflictError('Seats not found or not held by you');
      }
      if (seats.some(s => s.status !== 'locked')) {
        throw new ConflictError('Some seats are no longer locked (hold may have expired)');
      }

      const eventId = seats[0].event_id;
      const total   = seats.reduce((s, seat) => s + Number(seat.price), 0);

      const order = await orderRepo.create(client, { userId, eventId, totalAmount: total, status: 'paid' });
      await orderRepo.createItems(client, order.id, seats);
      await seatRepo.markSold(client, seatIds);

      const tickets = [];
      for (const seat of seats) {
        const payload = JSON.stringify({ order_id: order.id, seat_id: seat.id, user_id: userId });
        const qr = await QRCode.toDataURL(payload);
        const ticket = await ticketRepo.create(client, { orderId: order.id, seatId: seat.id, userId, qrCode: qr });
        tickets.push(ticket);
      }

      await client.query('COMMIT');

      if (this.io) {
        this.io.to(`event:${eventId}`).emit('seats:updated',
          seatIds.map(id => ({ id, event_id: eventId, status: 'sold' }))
        );
      }

      return { order, tickets };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
