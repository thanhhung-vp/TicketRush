import { Queue, Worker } from 'bullmq';
import redis from '../config/redis.js';
import pool from '../config/db.js';
import { cancelPendingOrdersForReleasedSeats } from '../utils/pendingHoldOrders.js';

const QUEUE_NAME = 'seat-release';

export const seatReleaseQueue = new Queue(QUEUE_NAME, { connection: redis });

export function startSeatReleaseWorker(io) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { seat_ids, user_id } = job.data;
      const ph = seat_ids.map((_, i) => `$${i + 2}`).join(',');

      // Only release seats whose locked_until has actually passed.
      // If /seats/renew was called, locked_until was pushed forward and this
      // job fires too early — the WHERE clause rejects it and seats stay locked.
      const client = await pool.connect();
      let rows = [];
      try {
        await client.query('BEGIN');
        const result = await client.query(
          `WITH candidates AS (
             SELECT id, event_id, locked_by
             FROM seats
             WHERE locked_by = $1
               AND status = 'locked'
               AND locked_until <= NOW()
               AND id IN (${ph})
             FOR UPDATE
           ),
           released AS (
             UPDATE seats s
             SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
             FROM candidates c
             WHERE s.id = c.id
             RETURNING s.id, c.event_id, c.locked_by
           )
           SELECT * FROM released`,
          [user_id, ...seat_ids]
        );
        rows = result.rows;
        await cancelPendingOrdersForReleasedSeats(client, rows);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }

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
    { connection: redis, concurrency: 10 }
  );

  worker.on('failed', (job, err) => {
    console.error(`Seat release job ${job?.id} failed:`, err.message);
  });

  console.log('✅  Seat release worker started');
  return worker;
}

// Fallback sweep — catches anything the queue misses (e.g. after a crash)
export async function sweepExpiredSeats(io) {
  const client = await pool.connect();
  let rows = [];
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `WITH candidates AS (
         SELECT id, event_id, locked_by
         FROM seats
         WHERE status = 'locked'
           AND locked_until <= NOW()
         FOR UPDATE
       ),
       released AS (
         UPDATE seats s
         SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
         FROM candidates c
         WHERE s.id = c.id
         RETURNING s.id, c.event_id, c.locked_by
       )
       SELECT * FROM released`
    );
    rows = result.rows;
    await cancelPendingOrdersForReleasedSeats(client, rows);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

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
}
