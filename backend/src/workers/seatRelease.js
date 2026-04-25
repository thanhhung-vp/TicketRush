import { Queue, Worker } from 'bullmq';
import redis from '../config/redis.js';
import pool from '../config/db.js';

const QUEUE_NAME = 'seat-release';

// Queue used by routes to enqueue jobs
export const seatReleaseQueue = new Queue(QUEUE_NAME, { connection: redis });

// Worker processes release jobs
export function startSeatReleaseWorker(io) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { seat_ids, user_id } = job.data;

      const placeholders = seat_ids.map((_, i) => `$${i + 2}`).join(',');
      const { rowCount } = await pool.query(
        `UPDATE seats
         SET status = 'available', locked_by = NULL, locked_at = NULL
         WHERE locked_by = $1
           AND id IN (${placeholders})
           AND status = 'locked'`,
        [user_id, ...seat_ids]
      );

      if (rowCount > 0 && io) {
        // Notify all clients in the event room that seats changed
        const { rows } = await pool.query(
          `SELECT id, event_id, status FROM seats WHERE id IN (${seat_ids.map((_, i) => `$${i + 1}`).join(',')})`,
          seat_ids
        );
        const eventId = rows[0]?.event_id;
        if (eventId) {
          io.to(`event:${eventId}`).emit('seats:updated', rows);
        }
      }
    },
    { connection: redis, concurrency: 10 }
  );

  worker.on('failed', (job, err) => {
    console.error(`Seat release job ${job?.id} failed:`, err.message);
  });

  console.log('✅  Seat release worker started');
  return worker;
}

// Fallback: cron-style sweep for any seats missed by queue
export async function sweepExpiredSeats(io) {
  const HOLD_MINUTES = Number(process.env.SEAT_HOLD_MINUTES) || 10;
  const { rows } = await pool.query(
    `UPDATE seats
     SET status = 'available', locked_by = NULL, locked_at = NULL
     WHERE status = 'locked'
       AND locked_at < NOW() - INTERVAL '${HOLD_MINUTES} minutes'
     RETURNING id, event_id`
  );

  if (rows.length > 0 && io) {
    const byEvent = rows.reduce((acc, s) => {
      (acc[s.event_id] ??= []).push({ id: s.id, status: 'available' });
      return acc;
    }, {});
    for (const [eventId, seats] of Object.entries(byEvent)) {
      io.to(`event:${eventId}`).emit('seats:updated', seats);
    }
    console.log(`Swept ${rows.length} expired seat(s)`);
  }
}
