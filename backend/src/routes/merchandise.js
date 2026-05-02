import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const merchSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price:       z.number().min(0),
  stock:       z.number().int().min(0),
  image_url:   z.string().url().optional().or(z.literal('')),
});

// GET /merchandise/:eventId — list merch for event (public)
router.get('/:eventId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM merchandise WHERE event_id = $1 ORDER BY created_at ASC',
      [req.params.eventId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /merchandise/:eventId — create merch (admin)
router.post('/:eventId', authenticate, requireAdmin, async (req, res) => {
  const parsed = merchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { name, description, price, stock, image_url } = parsed.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO merchandise (event_id, name, description, price, stock, image_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.eventId, name, description || null, price, stock, image_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /merchandise/:eventId/:merchId — update merch (admin)
router.patch('/:eventId/:merchId', authenticate, requireAdmin, async (req, res) => {
  const parsed = merchSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const fields = Object.keys(parsed.data);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const sets = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = fields.map(f => parsed.data[f]);
  try {
    const { rows } = await pool.query(
      `UPDATE merchandise SET ${sets} WHERE id = $1 AND event_id = $2 RETURNING *`,
      [req.params.merchId, req.params.eventId, ...values]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /merchandise/:eventId/:merchId — delete merch (admin)
router.delete('/:eventId/:merchId', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM merchandise WHERE id = $1 AND event_id = $2',
      [req.params.merchId, req.params.eventId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
