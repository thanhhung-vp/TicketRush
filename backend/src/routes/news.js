import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /news - public latest published posts
router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 12);

  try {
    const { rows } = await pool.query(
      `SELECT id, title, summary, content, image_url, status, published_at, created_at
       FROM news_posts
       WHERE status = 'published'
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
