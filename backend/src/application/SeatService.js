import pool from '../infrastructure/database/pool.js';
import { SeatRepository } from '../infrastructure/database/repositories/SeatRepository.js';
import { ConflictError, ValidationError } from '../domain/errors/AppError.js';
import { MAX_SEATS_PER_HOLD } from '../domain/constants.js';
import { config } from '../config/index.js';

const seatRepo = new SeatRepository();

export class SeatService {
  constructor(io, seatReleaseQueue) {
    this.io = io;
    this.seatReleaseQueue = seatReleaseQueue;
  }

  async hold(userId, seatIds) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new ValidationError('seat_ids must be a non-empty array');
    }
    if (seatIds.length > MAX_SEATS_PER_HOLD) {
      throw new ValidationError(`Cannot hold more than ${MAX_SEATS_PER_HOLD} seats at once`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lockedAt  = new Date();
      const { seats, eventId } = await seatRepo.lockSeats(client, seatIds, userId, lockedAt);
      await client.query('COMMIT');

      // Broadcast
      if (this.io && eventId) {
        this.io.to(`event:${eventId}`).emit('seats:updated',
          seats.map(s => ({ id: s.id, event_id: eventId, status: 'locked' }))
        );
      }

      // Schedule auto-release
      const holdMs   = config.seat.holdMinutes * 60_000;
      const lockedUntil = new Date(lockedAt.getTime() + holdMs);
      if (this.seatReleaseQueue) {
        await this.seatReleaseQueue.add('release', { seat_ids: seatIds, user_id: userId }, {
          delay: holdMs, jobId: `hold-${userId}-${Date.now()}`,
        });
      }

      return { ok: true, locked_until: lockedUntil, seat_ids: seatIds };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '55P03') throw new ConflictError('Seat is being grabbed by another user');
      throw err;
    } finally {
      client.release();
    }
  }

  async release(userId, seatIds) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new ValidationError('seat_ids required');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await seatRepo.releaseSeats(client, seatIds, userId);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async sweepExpired() {
    return seatRepo.sweepExpired(config.seat.holdMinutes);
  }
}
