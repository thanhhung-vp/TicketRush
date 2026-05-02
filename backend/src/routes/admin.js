import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /admin/events - all events (draft + on_sale + ended)
router.get('/events', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'locked')    AS locked_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'sold')      AS sold_seats,
              COUNT(s.id) AS total_seats
       FROM events e
       LEFT JOIN seats s ON s.event_id = e.id
       GROUP BY e.id
       ORDER BY e.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/dashboard - revenue & occupancy per event
router.get('/dashboard', async (req, res) => {
  try {
    const { rows: revenue } = await pool.query(
      `SELECT e.id, e.title, e.event_date, e.status,
              COALESCE(SUM(o.total_amount) FILTER (WHERE o.status='paid'), 0) AS total_revenue,
              COUNT(o.id) FILTER (WHERE o.status='paid') AS orders_paid,
              COUNT(s.id) FILTER (WHERE s.status = 'sold')      AS sold_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'locked')    AS locked_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) AS total_seats
       FROM events e
       LEFT JOIN orders o ON o.event_id = e.id
       LEFT JOIN seats  s ON s.event_id = e.id
       GROUP BY e.id
       ORDER BY e.event_date DESC`
    );

    const { rows: revenueByDay } = await pool.query(
      `SELECT DATE(paid_at) AS day, SUM(total_amount) AS revenue
       FROM orders
       WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day`
    );

    res.json({ events: revenue, revenue_by_day: revenueByDay });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/stats/audience - demographic statistics
router.get('/stats/audience', async (req, res) => {
  try {
    const { rows: byGender } = await pool.query(
      `SELECT u.gender, COUNT(*) AS count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.status = 'paid'
       GROUP BY u.gender`
    );

    const currentYear = new Date().getFullYear();
    const { rows: byAge } = await pool.query(
      `SELECT
         CASE
           WHEN ($1 - u.birth_year) < 18            THEN 'Under 18'
           WHEN ($1 - u.birth_year) BETWEEN 18 AND 24 THEN '18-24'
           WHEN ($1 - u.birth_year) BETWEEN 25 AND 34 THEN '25-34'
           WHEN ($1 - u.birth_year) BETWEEN 35 AND 44 THEN '35-44'
           ELSE '45+'
         END AS age_group,
         COUNT(*) AS count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.status = 'paid' AND u.birth_year IS NOT NULL
       GROUP BY age_group
       ORDER BY age_group`,
      [currentYear]
    );

    res.json({ by_gender: byGender, by_age: byAge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/events/:id/seats - seat occupancy map for a specific event
router.get('/events/:id/seats', async (req, res) => {
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

export default router;
