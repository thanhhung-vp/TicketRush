import { Queue, Worker } from 'bullmq';
import pool from '../config/db.js';

const QUEUE_NAME = 'seat-release';

// Build a lazy Redis connection for BullMQ — only connects when Redis is available.
// If Redis is unavailable, queue operations in seats.js are wrapped in try/catch
// and the sweepExpiredSeats fallback ensures seats are still released.
function getRedisOpts() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
}

export const seatReleaseQueue = new Queue(QUEUE_NAME, { connection: getRedisOpts() });

export function startSeatReleaseWorker(io) {
  try {
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const { seat_ids, user_id } = job.data;
        const ph = seat_ids.map((_, i) => `$${i + 2}`).join(',');

        // Only release seats whose locked_until has actually passed.
        // If /seats/renew was called, locked_until was pushed forward and this
        // job fires too early — the WHERE clause rejects it and seats stay locked.
        const { rows } = await pool.query(
          `UPDATE seats
           SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
           WHERE locked_by = $1
             AND status   = 'locked'
             AND locked_until <= NOW()
             AND id IN (${ph})
           RETURNING id, event_id`,
          [user_id, ...seat_ids]
        );

        if (rows.length > 0 && io) {
          const byEvent = rows.reduce((acc, s) => {
            (acc[s.event_id] ??= []).push({ id: s.id, event_id: s.event_id, status: 'available' });
            return acc;
          }, {});
          for (const [eventId, seats] of Object.entries(byEvent)) {
            io.to(`event:${eventId}`).emit('seats:updated', seats);
          }
        }
      },
      { connection: getRedisOpts(), concurrency: 10 }
    );

    worker.on('failed', (job, err) => {
      console.error(`Seat release job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      // Suppress noisy Redis connection errors when Redis is unavailable
      if (err.code !== 'ECONNREFUSED') {
        console.error('Seat release worker error:', err.message);
      }
    });

    console.log('✅  Seat release worker started');
    return worker;
  } catch (err) {
    console.warn('⚠️  Seat release worker could not start (Redis unavailable). Sweep fallback active.');
    return null;
  }
}

// Fallback sweep — catches anything the queue misses (e.g. after a crash)
export async function sweepExpiredSeats(io) {
  try {
    const { rows } = await pool.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
       WHERE status = 'locked' AND locked_until <= NOW()
       RETURNING id, event_id`
    );

    if (rows.length > 0 && io) {
      const byEvent = rows.reduce((acc, s) => {
        (acc[s.event_id] ??= []).push({ id: s.id, event_id: s.event_id, status: 'available' });
        return acc;
      }, {});
      for (const [eventId, seats] of Object.entries(byEvent)) {
        io.to(`event:${eventId}`).emit('seats:updated', seats);
      }
      console.log(`Swept ${rows.length} expired seat(s)`);
    }
  } catch (err) {
    // DB may be unavailable during startup
    if (err.code !== 'ECONNREFUSED') {
      console.error('Sweep error:', err.message);
    }
  }
}
