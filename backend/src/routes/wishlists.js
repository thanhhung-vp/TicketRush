import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /wishlists — my wishlist
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.venue, e.event_date, e.poster_url, e.category, e.status,
              w.created_at AS saved_at
       FROM wishlists w
       JOIN events e ON e.id = w.event_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /wishlists/:eventId — add to wishlist
router.post('/:eventId', authenticate, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO wishlists (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.eventId]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /wishlists/:eventId — remove from wishlist
router.delete('/:eventId', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND event_id = $2',
      [req.user.id, req.params.eventId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /wishlists/check/:eventId — is this event in my wishlist?
router.get('/check/:eventId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM wishlists WHERE user_id = $1 AND event_id = $2',
      [req.user.id, req.params.eventId]
    );
    res.json({ saved: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
