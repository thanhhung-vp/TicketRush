import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { CATEGORIES, eventSchema, eventUpdateSchema } from '../utils/eventValidation.js';
import { canDeleteEvent } from '../utils/eventDeletionRules.js';
import { admittedKey, highLoadKey, queueKey } from '../utils/queueKeys.js';
import { normalizeQueueBatchSize, userHasQueueAccess } from '../utils/virtualQueueRules.js';

const router = Router();

function getOptionalUser(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function userCanReadEventSeats(eventId, req) {
  const { rows } = await pool.query(
    `SELECT queue_enabled FROM events WHERE id = $1`,
    [eventId]
  );
  const event = rows[0];
  if (!event) return { ok: false, status: 404, error: 'Event not found' };
  if (!event.queue_enabled) return { ok: true };

  const user = getOptionalUser(req);
  if (!user) {
    return { ok: false, status: 401, error: 'Vui lòng đăng nhập để vào phòng chờ.', code: 'QUEUE_REQUIRED' };
  }

  const admitted = await redis.sismember(admittedKey(eventId), user.id);
  const allowed = userHasQueueAccess({
    queueEnabled: true,
    admitted,
    isAdmin: user.role === 'admin',
  });
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      error: 'Bạn cần vào phòng chờ trước khi chọn ghế.',
      code: 'QUEUE_REQUIRED',
      event_id: eventId,
    };
  }

  return { ok: true };
}

// ── Public ────────────────────────────────────────────────

// GET /events?search=&category=&date_from=&date_to=&location=&min_price=&max_price=&sort=date|price_asc|price_desc&limit=&offset=
router.get('/', async (req, res) => {
  const { search, category, date_from, date_to, location, min_price, max_price, sort, limit, offset } = req.query;
  const pageLimit  = Math.min(Math.max(Number(limit)  || 0, 0), 100);
  const pageOffset = Math.max(Number(offset) || 0, 0);
  const conditions = [`e.status IN ('on_sale', 'ended', 'scheduled')`];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(e.title ILIKE $${params.length} OR e.venue ILIKE $${params.length} OR e.description ILIKE $${params.length})`);
  }
  if (category && CATEGORIES.includes(category)) {
    params.push(category);
    conditions.push(`e.category = $${params.length}`);
  }
  if (date_from) {
    params.push(date_from);
    conditions.push(`e.event_date >= $${params.length}`);
  }
  if (date_to) {
    // Include the whole end day
    params.push(date_to);
    conditions.push(`e.event_date <= ($${params.length}::date + interval '1 day')`);
  }
  if (location) {
    params.push(`%${location}%`);
    conditions.push(`e.venue ILIKE $${params.length}`);
  }

  const orderMap = {
    date:       '(e.event_date < NOW()) ASC, e.event_date ASC',
    price_asc:  '(e.event_date < NOW()) ASC, min_price ASC NULLS LAST',
    price_desc: '(e.event_date < NOW()) ASC, min_price DESC NULLS LAST',
    newest:     '(e.event_date < NOW()) ASC, e.created_at DESC',
  };
  const orderBy = orderMap[sort] || '(e.event_date < NOW()) ASC, e.event_date ASC';

  const havingClauses = [];
  if (min_price) {
    params.push(Number(min_price));
    havingClauses.push(`MIN(z.price) >= $${params.length}`);
  }
  if (max_price) {
    params.push(Number(max_price));
    havingClauses.push(`MIN(z.price) <= $${params.length}`);
  }
  const having = havingClauses.length ? `HAVING ${havingClauses.join(' AND ')}` : '';

  const where = conditions.join(' AND ');
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) AS total_seats,
              MIN(z.price) AS min_price,
              MAX(z.price) AS max_price
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
       LEFT JOIN zones z ON z.event_id = e.id
       WHERE ${where}
       GROUP BY e.id
       ${having}
       ORDER BY ${orderBy}
       ${pageLimit > 0 ? `LIMIT ${pageLimit} OFFSET ${pageOffset}` : ''}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /events/suggestions?q=
router.get('/suggestions', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 1) return res.json([]);

  try {
    const pattern = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (type, label)
              label, type, extra_info, event_id, event_date, min_price
       FROM (
         -- Event title matches
         SELECT e.title         AS label,
                'event'         AS type,
                e.category      AS extra_info,
                e.id            AS event_id,
                e.event_date,
                MIN(z.price)    AS min_price
         FROM events e
         LEFT JOIN zones z ON z.event_id = e.id
         WHERE e.status = 'on_sale'
           AND (e.title ILIKE $1 OR e.description ILIKE $1)
         GROUP BY e.id
         UNION ALL
         -- Venue matches
         SELECT e.venue         AS label,
                'venue'         AS type,
                NULL            AS extra_info,
                NULL            AS event_id,
                MIN(e.event_date) AS event_date,
                NULL            AS min_price
         FROM events e
         WHERE e.status = 'on_sale' AND e.venue ILIKE $1
         GROUP BY e.venue
       ) sub
       ORDER BY type, label, event_date ASC
       LIMIT 10`,
      [pattern]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /events/featured
router.get('/featured', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(DISTINCT s.id) AS total_seats,
              MIN(z.price) AS min_price,
              MAX(z.price) AS max_price
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
       LEFT JOIN zones z ON z.event_id = e.id
       WHERE e.is_featured = TRUE
         AND e.status IN ('on_sale', 'ended')
       GROUP BY e.id
       ORDER BY (e.event_date < NOW()) ASC, e.event_date ASC, e.created_at DESC
       LIMIT 6`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /events/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: events } = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [req.params.id]
    );
    if (!events[0]) return res.status(404).json({ error: 'Event not found' });

    const { rows: zones } = await pool.query(
      `SELECT z.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) AS total_seats
       FROM zones z
       LEFT JOIN seats s ON s.zone_id = z.id
       WHERE z.event_id = $1
       GROUP BY z.id
       ORDER BY z.name`,
      [req.params.id]
    );

    res.json({ ...events[0], zones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /events/:id/seats
router.get('/:id/seats', async (req, res) => {
  try {
    const queueAccess = await userCanReadEventSeats(req.params.id, req);
    if (!queueAccess.ok) {
      return res.status(queueAccess.status).json({
        error: queueAccess.error,
        code: queueAccess.code,
        event_id: queueAccess.event_id,
      });
    }

    const { rows } = await pool.query(
      `SELECT s.id, s.zone_id, s.row_idx, s.col_idx, s.label, s.status,
              z.name AS zone_name, z.price, z.color, z.rows, z.cols
       FROM seats s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.event_id = $1
       ORDER BY z.name, s.row_idx, s.col_idx`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin ─────────────────────────────────────────────────

// POST /events
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const {
    title,
    description,
    venue,
    event_date,
    poster_url,
    category,
    status: initStatus = 'draft',
    sale_start_at,
    is_featured = false,
    queue_enabled = false,
    queue_batch_size,
  } = parsed.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO events
         (title, description, venue, event_date, poster_url, category, status, sale_start_at,
          is_featured, queue_enabled, queue_batch_size, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        title,
        description || null,
        venue,
        event_date,
        poster_url || null,
        category,
        initStatus,
        sale_start_at || null,
        is_featured,
        queue_enabled,
        normalizeQueueBatchSize(queue_batch_size),
        req.user.id,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /events/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const parsed = eventUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const allowed = [
    'title',
    'description',
    'venue',
    'event_date',
    'poster_url',
    'status',
    'sale_start_at',
    'category',
    'is_featured',
    'queue_enabled',
    'queue_batch_size',
  ];
  const fields = Object.keys(parsed.data).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => (
    f === 'queue_batch_size' ? normalizeQueueBatchSize(parsed.data[f]) : parsed.data[f]
  ));
  try {
    const { rows } = await pool.query(
      `UPDATE events SET ${sets} WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    if (parsed.data.queue_enabled === false) {
      await redis.del(highLoadKey(req.params.id), queueKey(req.params.id), admittedKey(req.params.id));
    } else if (parsed.data.queue_enabled === true) {
      await redis.set(highLoadKey(req.params.id), '1');
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: eventRows } = await client.query(
      `SELECT id FROM events WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!eventRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    const { rows: [stats] } = await client.query(
      `SELECT
         COUNT(s.id) FILTER (WHERE s.status = 'sold') AS sold_seats,
         COUNT(s.id) FILTER (WHERE s.status = 'locked') AS locked_seats,
         (SELECT COUNT(*) FROM orders o WHERE o.event_id = $1 AND o.status = 'paid') AS paid_orders,
         (SELECT COUNT(*) FROM orders o WHERE o.event_id = $1) AS orders,
         (SELECT COUNT(*) FROM tickets t
          JOIN orders o ON o.id = t.order_id
          WHERE o.event_id = $1) AS tickets,
         (SELECT COUNT(*) FROM admin_ticket_actions a WHERE a.event_id = $1) AS admin_actions
       FROM seats s
       WHERE s.event_id = $1`,
      [req.params.id]
    );

    const deletion = canDeleteEvent({
      soldSeats: stats?.sold_seats,
      lockedSeats: stats?.locked_seats,
      paidOrders: stats?.paid_orders,
      orders: stats?.orders,
      tickets: stats?.tickets,
      adminActions: stats?.admin_actions,
    });
    if (!deletion.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: deletion.error });
    }

    await client.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    await redis.del(highLoadKey(req.params.id), queueKey(req.params.id), admittedKey(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /events/:id/zones
const zoneSchema = z.object({
  name:  z.string().min(1).max(50),
  rows:  z.number().int().min(1).max(50),
  cols:  z.number().int().min(1).max(50),
  price: z.number().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

router.post('/:id/zones', authenticate, requireAdmin, async (req, res) => {
  const parsed = zoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { name, rows, cols, price, color } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: zoneRows } = await client.query(
      `INSERT INTO zones (event_id, name, rows, cols, price, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, name, rows, cols, price, color || '#3B82F6']
    );
    const zone = zoneRows[0];

    const seatValues = [];
    const seatParams = [];
    let idx = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const label = `${name}-${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`;
        seatValues.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
        seatParams.push(zone.id, req.params.id, r, c, label);
      }
    }
    await client.query(
      `INSERT INTO seats (zone_id, event_id, row_idx, col_idx, label) VALUES ${seatValues.join(',')}`,
      seatParams
    );
    await client.query('COMMIT');
    res.status(201).json({ zone, seats_created: rows * cols });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /events/:id/zones/:zoneId
router.delete('/:id/zones/:zoneId', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM zones WHERE id=$1 AND event_id=$2', [req.params.zoneId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /events/:id/layout  — replace all zones+seats from designer layout
router.put('/:id/layout', authenticate, requireAdmin, async (req, res) => {
  const { zones: layoutZones, canvas } = req.body;
  if (!Array.isArray(layoutZones) || layoutZones.length === 0) {
    return res.status(400).json({ error: 'zones array required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wipe existing zones (seats cascade)
    await client.query('DELETE FROM zones WHERE event_id = $1', [req.params.id]);

    const savedZones = [];

    for (const z of layoutZones) {
      const rows  = Math.max(1, Math.min(50, Number(z.rows)  || 5));
      const cols  = Math.max(1, Math.min(50, Number(z.cols)  || 8));
      const price = Math.max(0, Number(z.price) || 0);
      const color = /^#[0-9A-Fa-f]{6}$/.test(z.color) ? z.color : '#3B82F6';

      const { rows: zr } = await client.query(
        `INSERT INTO zones (event_id, name, rows, cols, price, color)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.params.id, (z.name || 'Khu').slice(0, 50), rows, cols, price, color]
      );
      const zone = zr[0];

      // Build seat insert
      const vals = [];
      const params = [];
      let pi = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const label = `${zone.name}-${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`;
          vals.push(`($${pi++},$${pi++},$${pi++},$${pi++},$${pi++})`);
          params.push(zone.id, req.params.id, r, c, label);
        }
      }
      await client.query(
        `INSERT INTO seats (zone_id, event_id, row_idx, col_idx, label) VALUES ${vals.join(',')}`,
        params
      );

      savedZones.push({ ...z, dbId: zone.id, id: zone.id.toString() });
    }

    // Persist layout_json with real DB ids
    const layoutJson = { canvas: canvas || { width: 860, height: 540 }, zones: savedZones, stages: req.body.stages || [] };
    await client.query(
      'UPDATE events SET layout_json = $1 WHERE id = $2',
      [JSON.stringify(layoutJson), req.params.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, zones_created: savedZones.length, layout: layoutJson });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
