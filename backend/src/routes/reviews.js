import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const reviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// GET /reviews/:eventId — list reviews for an event
router.get('/:eventId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.full_name, u.id AS user_id
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.eventId]
    );
    const avg = rows.length
      ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)
      : null;
    res.json({ reviews: rows, average: avg ? parseFloat(avg) : null, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /reviews/:eventId/mine — get my review for this event
router.get('/:eventId/mine', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND event_id = $2',
      [req.user.id, req.params.eventId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /reviews/:eventId — create or update review
router.post('/:eventId', authenticate, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { rating, comment } = parsed.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, event_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
       RETURNING *`,
      [req.user.id, req.params.eventId, rating, comment || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /reviews/:eventId — delete my review
router.delete('/:eventId', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM reviews WHERE user_id = $1 AND event_id = $2',
      [req.user.id, req.params.eventId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
