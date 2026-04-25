import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /events - list published events
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) AS total_seats
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
       WHERE e.status = 'on_sale'
       GROUP BY e.id
       ORDER BY e.event_date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /events/:id - event detail with zones + seat counts
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

// GET /events/:id/seats - all seats for seat map
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

// ── Admin routes ──────────────────────────────────────────

// POST /events - create event
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { title, description, venue, event_date, poster_url } = req.body;
  if (!title || !venue || !event_date) {
    return res.status(400).json({ error: 'title, venue, event_date required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, venue, event_date, poster_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, description, venue, event_date, poster_url || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /events/:id - update event (status, info)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const allowed = ['title', 'description', 'venue', 'event_date', 'poster_url', 'status'];
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

// POST /events/:id/zones - add zone + auto-generate seats
router.post('/:id/zones', authenticate, requireAdmin, async (req, res) => {
  const { name, rows, cols, price, color } = req.body;
  if (!name || !rows || !cols || price === undefined) {
    return res.status(400).json({ error: 'name, rows, cols, price required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: zoneRows } = await client.query(
      `INSERT INTO zones (event_id, name, rows, cols, price, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, name, rows, cols, price, color || '#3B82F6']
    );
    const zone = zoneRows[0];

    // Generate seats for the matrix
    const seatValues = [];
    const seatParams = [];
    let paramIdx = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const label = `${name}-${String.fromCharCode(65 + r)}${String(c + 1).padStart(2, '0')}`;
        seatValues.push(`($${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++},$${paramIdx++})`);
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
