import pool from '../config/db.js';

let timer = null;

export async function processScheduledEvents({ db = pool } = {}) {
  const { rows } = await db.query(
    `UPDATE events
     SET status = 'on_sale'
     WHERE status = 'scheduled'
       AND sale_start_at IS NOT NULL
       AND sale_start_at <= NOW()
     RETURNING id, title`
  );
  if (rows.length > 0) {
    console.log(`[scheduled-events] activated: ${rows.map(r => r.title).join(', ')}`);
  }
  return rows;
}

export function startScheduledEventsWorker(intervalMs = 60_000) {
  if (timer) return timer;
  timer = setInterval(() => {
    processScheduledEvents().catch(err => {
      console.error('[scheduled-events worker]', err.message);
    });
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function stopScheduledEventsWorker() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
