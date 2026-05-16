import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const notificationIdSchema = z.string().uuid();

router.use(authenticate);

router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  try {
    const [{ rows }, { rows: unreadRows }] = await Promise.all([
      pool.query(
        `SELECT id, type, title, body, action_url, metadata, read_at, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [req.user.id, limit]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS unread_count
         FROM notifications
         WHERE user_id = $1 AND read_at IS NULL`,
        [req.user.id]
      ),
    ]);

    res.json({ notifications: rows, unread_count: unreadRows[0]?.unread_count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/read', async (req, res) => {
  const parsed = notificationIdSchema.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid notification id' });

  try {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2
       RETURNING id, type, title, body, action_url, metadata, read_at, created_at`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
