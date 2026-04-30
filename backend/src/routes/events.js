import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const CATEGORIES = ['music', 'sports', 'arts', 'conference', 'comedy', 'festival', 'other'];

// ── Public ────────────────────────────────────────────────

// GET /events?search=&category=&date_from=&date_to=&location=
router.get('/', async (req, res) => {
  const { search, category, date_from, date_to, location } = req.query;
  const conditions = [`e.status = 'on_sale'`];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(e.title ILIKE $${params.length} OR e.venue ILIKE $${params.length})`);
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
    params.push(date_to);
    conditions.push(`e.event_date <= $${params.length}`);
  }
  if (location) {
    params.push(`%${location}%`);
    conditions.push(`e.venue ILIKE $${params.length}`);
  }

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
       ORDER BY e.event_date ASC`,
      params
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

const eventSchema = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  venue:       z.string().min(3).max(300),
  event_date:  z.string().datetime({ offset: true }),
  poster_url:  z.string().url().optional().or(z.literal('')),
  category:    z.enum(CATEGORIES).default('other'),
  status:      z.enum(['draft', 'on_sale', 'ended']).optional(),
});

// POST /events
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { title, description, venue, event_date, poster_url, category } = parsed.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, venue, event_date, poster_url, category, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, venue, event_date, poster_url || null, category, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /events/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const allowed = ['title', 'description', 'venue', 'event_date', 'poster_url', 'status', 'category'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => req.body[f]);
  try {
    const { rows } = await pool.query(
      `UPDATE events SET ${sets} WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM events WHERE id = $1 AND status = 'draft'`,
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(400).json({ error: 'Only draft events can be deleted' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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

export default router;
