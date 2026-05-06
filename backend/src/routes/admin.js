import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getAdminDashboard } from '../services/adminDashboard.js';
import { attachDynamicQrToTicket } from '../utils/ticketQr.js';
import { recalculateOrderAfterTicketRemoval } from '../utils/orderTotals.js';

const router = Router();
router.use(authenticate, requireAdmin);

const uuidSchema = z.string().uuid();
const ticketAddSchema = z.object({
  seat_id: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});
const ticketDeleteSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
const newsStatusSchema = z.enum(['draft', 'published']);
const newsCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(280).optional().or(z.literal('')),
  content: z.string().trim().min(1).max(10000),
  image_url: z.string().trim().url().max(500).optional().or(z.literal('')),
  status: newsStatusSchema.default('draft'),
});
const newsUpdateSchema = newsCreateSchema.partial();

function normalizeOptionalText(value) {
  return value?.trim() || null;
}

async function broadcastSeatUpdate(app, eventId, seatIds, status) {
  const io = app.get('io');
  if (!io) return;
  io.to(`event:${eventId}`).emit('seats:updated', seatIds.map(id => ({ id, event_id: eventId, status })));
}

// GET /admin/events - all events (draft + on_sale + ended)
router.get('/events', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*,
              COUNT(s.id) FILTER (WHERE s.status = 'available') AS available_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'locked')    AS locked_seats,
              COUNT(s.id) FILTER (WHERE s.status = 'sold')      AS sold_seats,
              COUNT(s.id) AS total_seats,
              (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.event_id = e.id AND o.status = 'paid') AS total_revenue,
              (SELECT COUNT(*) FROM orders o WHERE o.event_id = e.id AND o.status = 'paid') AS orders_paid,
              (SELECT COUNT(*) FROM orders o WHERE o.event_id = e.id) AS order_count,
              (SELECT COUNT(*) FROM admin_ticket_actions a WHERE a.event_id = e.id) AS admin_action_count
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
    res.json(await getAdminDashboard(pool));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/news - list all news posts for admins
router.get('/news', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, u.full_name AS author_name, u.email AS author_email
       FROM news_posts n
       LEFT JOIN users u ON u.id = n.created_by
       ORDER BY n.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/news - create a news post
router.post('/news', async (req, res) => {
  const parsed = newsCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { title, content, status } = parsed.data;
  const summary = normalizeOptionalText(parsed.data.summary);
  const imageUrl = normalizeOptionalText(parsed.data.image_url);
  const publishedAt = status === 'published' ? new Date() : null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO news_posts (title, summary, content, image_url, status, created_by, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, summary, content, imageUrl, status, req.user.id, publishedAt]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /admin/news/:id - update a news post
router.patch('/news/:id', async (req, res) => {
  const newsId = uuidSchema.safeParse(req.params.id);
  if (!newsId.success) return res.status(400).json({ error: 'Invalid news id' });

  const parsed = newsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const fields = Object.keys(parsed.data);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const values = [req.params.id];
  const sets = [];
  const pushSet = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (Object.hasOwn(parsed.data, 'title')) pushSet('title', parsed.data.title);
  if (Object.hasOwn(parsed.data, 'summary')) pushSet('summary', normalizeOptionalText(parsed.data.summary));
  if (Object.hasOwn(parsed.data, 'content')) pushSet('content', parsed.data.content);
  if (Object.hasOwn(parsed.data, 'image_url')) pushSet('image_url', normalizeOptionalText(parsed.data.image_url));
  if (Object.hasOwn(parsed.data, 'status')) {
    pushSet('status', parsed.data.status);
    sets.push(parsed.data.status === 'published' ? 'published_at = COALESCE(published_at, NOW())' : 'published_at = NULL');
  }
  sets.push('updated_at = NOW()');

  try {
    const { rows } = await pool.query(
      `UPDATE news_posts SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'News post not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /admin/news/:id
router.delete('/news/:id', async (req, res) => {
  const newsId = uuidSchema.safeParse(req.params.id);
  if (!newsId.success) return res.status(400).json({ error: 'Invalid news id' });

  try {
    const { rowCount } = await pool.query('DELETE FROM news_posts WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'News post not found' });
    res.json({ ok: true });
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

// GET /admin/events/:id/audience - demographic statistics for one event
router.get('/events/:id/audience', async (req, res) => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid event id' });

  try {
    const { rows: summaryRows } = await pool.query(
      `SELECT COUNT(t.id) AS total_tickets,
              COUNT(DISTINCT t.user_id) AS total_customers
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       WHERE o.event_id = $1 AND o.status = 'paid'`,
      [req.params.id]
    );

    const { rows: byGender } = await pool.query(
      `SELECT COALESCE(u.gender, 'unknown') AS gender, COUNT(t.id) AS count
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       JOIN users u ON u.id = t.user_id
       WHERE o.event_id = $1 AND o.status = 'paid'
       GROUP BY COALESCE(u.gender, 'unknown')`,
      [req.params.id]
    );

    const currentYear = new Date().getFullYear();
    const { rows: byAge } = await pool.query(
      `SELECT
         CASE
           WHEN u.birth_year IS NULL THEN 'Unknown'
           WHEN ($2 - u.birth_year) < 18 THEN 'Under 18'
           WHEN ($2 - u.birth_year) BETWEEN 18 AND 24 THEN '18-24'
           WHEN ($2 - u.birth_year) BETWEEN 25 AND 34 THEN '25-34'
           WHEN ($2 - u.birth_year) BETWEEN 35 AND 44 THEN '35-44'
           ELSE '45+'
         END AS age_group,
         COUNT(t.id) AS count
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       JOIN users u ON u.id = t.user_id
       WHERE o.event_id = $1 AND o.status = 'paid'
       GROUP BY age_group
       ORDER BY age_group`,
      [req.params.id, currentYear]
    );

    res.json({
      summary: summaryRows[0] || { total_tickets: 0, total_customers: 0 },
      by_gender: byGender,
      by_age: byAge,
    });
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

// GET /admin/customers - customer list with purchase totals
router.get('/customers', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const pattern = `%${search}%`;

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.gender, u.birth_year, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid') AS order_count,
              (SELECT COUNT(*) FROM tickets t WHERE t.user_id = u.id) AS ticket_count,
              (SELECT COUNT(*) FROM admin_ticket_actions a WHERE a.user_id = u.id AND a.action_type = 'deleted') AS cancelled_ticket_count,
              (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id AND o.status = 'paid') AS total_spent
       FROM users u
       WHERE u.role = 'customer'
         AND ($1 = '' OR u.email ILIKE $2 OR u.full_name ILIKE $2)
       ORDER BY u.created_at DESC
       LIMIT 100`,
      [search, pattern]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin/customers/:id/history - purchases and admin ticket actions
router.get('/customers/:id/history', async (req, res) => {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid customer id' });

  try {
    const { rows: customerRows } = await pool.query(
      `SELECT id, email, full_name, gender, birth_year, created_at
       FROM users
       WHERE id = $1 AND role = 'customer'`,
      [req.params.id]
    );
    if (!customerRows[0]) return res.status(404).json({ error: 'Customer not found' });

    const { rows: purchases } = await pool.query(
      `SELECT o.id, o.event_id, o.total_amount, o.status, o.created_at, o.paid_at,
              e.title AS event_title, e.event_date, e.venue,
              COALESCE(
                json_agg(
                  json_build_object(
                    'ticket_id', t.id,
                    'seat_id', s.id,
                    'label', s.label,
                    'zone', z.name,
                    'price', z.price,
                    'checked_in_at', t.checked_in_at
                  )
                  ORDER BY z.name, s.row_idx, s.col_idx
                ) FILTER (WHERE t.id IS NOT NULL),
                '[]'::json
              ) AS tickets
       FROM orders o
       JOIN events e ON e.id = o.event_id
       LEFT JOIN tickets t ON t.order_id = o.id AND t.user_id = o.user_id
       LEFT JOIN seats s ON s.id = t.seat_id
       LEFT JOIN zones z ON z.id = s.zone_id
       WHERE o.user_id = $1 AND o.status IN ('pending', 'paid', 'cancelled')
       GROUP BY o.id, e.id
       ORDER BY COALESCE(o.paid_at, o.created_at) DESC`,
      [req.params.id]
    );

    const { rows: actions } = await pool.query(
      `SELECT a.*, e.title AS event_title, e.event_date,
              s.label AS seat_label, z.name AS zone_name,
              admin.full_name AS admin_name, admin.email AS admin_email
       FROM admin_ticket_actions a
       JOIN events e ON e.id = a.event_id
       LEFT JOIN seats s ON s.id = a.seat_id
       LEFT JOIN zones z ON z.id = s.zone_id
       JOIN users admin ON admin.id = a.admin_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    res.json({ customer: customerRows[0], purchases, actions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/customers/:id/tickets - issue a paid ticket to a customer
router.post('/customers/:id/tickets', async (req, res) => {
  const customerId = uuidSchema.safeParse(req.params.id);
  const body = ticketAddSchema.safeParse(req.body);
  if (!customerId.success) return res.status(400).json({ error: 'Invalid customer id' });
  if (!body.success) {
    return res.status(400).json({ error: 'Validation failed', details: body.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: customerRows } = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'customer' FOR UPDATE`,
      [req.params.id]
    );
    if (!customerRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { rows: seatRows } = await client.query(
      `SELECT s.id, s.event_id, s.status, z.price
       FROM seats s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.id = $1
       FOR UPDATE`,
      [body.data.seat_id]
    );
    const seat = seatRows[0];
    if (!seat) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Seat not found' });
    }
    if (seat.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Seat is not available' });
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, event_id, total_amount, status, paid_at)
       VALUES ($1, $2, $3, 'paid', NOW())
       RETURNING *`,
      [req.params.id, seat.event_id, seat.price]
    );
    const order = orderRows[0];

    await client.query(
      `INSERT INTO order_items (order_id, seat_id, price) VALUES ($1, $2, $3)`,
      [order.id, seat.id, seat.price]
    );
    await client.query(
      `UPDATE seats
       SET status = 'sold', locked_by = NULL, locked_at = NULL, locked_until = NULL
       WHERE id = $1`,
      [seat.id]
    );

    const payload = JSON.stringify({ order_id: order.id, seat_id: seat.id, user_id: req.params.id, issued_by: req.user.id });
    const qr = await QRCode.toDataURL(payload);
    const { rows: ticketRows } = await client.query(
      `INSERT INTO tickets (order_id, seat_id, user_id, qr_code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [order.id, seat.id, req.params.id, qr]
    );
    const ticket = await attachDynamicQrToTicket({ ...ticketRows[0], event_id: seat.event_id });

    await client.query(
      `INSERT INTO admin_ticket_actions
         (action_type, admin_id, user_id, event_id, order_id, ticket_id, seat_id, price, reason)
       VALUES ('added', $1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.id, req.params.id, seat.event_id, order.id, ticket.id, seat.id, seat.price, body.data.reason || null]
    );

    await client.query('COMMIT');
    await broadcastSeatUpdate(req.app, seat.event_id, [seat.id], 'sold');
    res.status(201).json({ order, ticket });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /admin/tickets/:id - remove a purchased ticket and free its seat
router.delete('/tickets/:id', async (req, res) => {
  const ticketId = uuidSchema.safeParse(req.params.id);
  const body = ticketDeleteSchema.safeParse(req.body || {});
  if (!ticketId.success) return res.status(400).json({ error: 'Invalid ticket id' });
  if (!body.success) {
    return res.status(400).json({ error: 'Validation failed', details: body.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ticketRows } = await client.query(
      `SELECT t.id, t.order_id, t.user_id, t.seat_id,
              s.event_id, z.price
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       WHERE t.id = $1
       FOR UPDATE`,
      [req.params.id]
    );
    const ticket = ticketRows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await client.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [ticket.order_id]);
    await client.query('DELETE FROM tickets WHERE id = $1', [ticket.id]);
    await client.query(
      `DELETE FROM order_items WHERE order_id = $1 AND seat_id = $2`,
      [ticket.order_id, ticket.seat_id]
    );
    await client.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
       WHERE id = $1`,
      [ticket.seat_id]
    );
    await recalculateOrderAfterTicketRemoval(client, ticket.order_id);
    await client.query(
      `INSERT INTO admin_ticket_actions
         (action_type, admin_id, user_id, event_id, order_id, ticket_id, seat_id, price, reason)
       VALUES ('deleted', $1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.id, ticket.user_id, ticket.event_id, ticket.order_id, ticket.id, ticket.seat_id, ticket.price, body.data.reason || null]
    );

    await client.query('COMMIT');
    await broadcastSeatUpdate(req.app, ticket.event_id, [ticket.seat_id], 'available');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /admin/refunds - list refund requests
router.get('/refunds', async (req, res) => {
  const statusFilter = req.query.status;
  try {
    let query = `
      SELECT r.*,
             u.email as user_email, u.full_name as user_name,
             e.title as event_title, e.event_date,
             s.label as seat_label, z.name as zone_name
      FROM ticket_refund_requests r
      JOIN users u ON u.id = r.user_id
      JOIN events e ON e.id = r.event_id
      JOIN seats s ON s.id = r.seat_id
      LEFT JOIN zones z ON z.id = s.zone_id
    `;
    const params = [];
    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      query += ` WHERE r.status = $1`;
      params.push(statusFilter);
    }
    query += ` ORDER BY r.created_at DESC`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /admin/refunds/:id/approve - approve a refund request
router.post('/refunds/:id/approve', async (req, res) => {
  const refundId = uuidSchema.safeParse(req.params.id);
  if (!refundId.success) return res.status(400).json({ error: 'Invalid refund id' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { rows: refundRows } = await client.query(
      `SELECT * FROM ticket_refund_requests WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const refund = refundRows[0];
    
    if (!refund) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Refund request not found' });
    }
    if (refund.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Refund request is not pending' });
    }

    // lock order
    await client.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [refund.order_id]);
    
    // delete ticket
    await client.query('DELETE FROM tickets WHERE id = $1', [refund.ticket_id]);
    
    // delete order item
    await client.query(
      `DELETE FROM order_items WHERE order_id = $1 AND seat_id = $2`,
      [refund.order_id, refund.seat_id]
    );
    
    // update seat
    await client.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
       WHERE id = $1`,
      [refund.seat_id]
    );
    
    // recalculate order
    await recalculateOrderAfterTicketRemoval(client, refund.order_id);
    
    // update refund status
    await client.query(
      `UPDATE ticket_refund_requests 
       SET status = 'approved', resolved_at = NOW() 
       WHERE id = $1`,
      [refund.id]
    );

    await client.query('COMMIT');
    await broadcastSeatUpdate(req.app, refund.event_id, [refund.seat_id], 'available');
    
    res.json({ ok: true, message: 'Refund approved successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /admin/refunds/:id/reject - reject a refund request
router.post('/refunds/:id/reject', async (req, res) => {
  const refundId = uuidSchema.safeParse(req.params.id);
  if (!refundId.success) return res.status(400).json({ error: 'Invalid refund id' });

  try {
    const { rowCount } = await pool.query(
      `UPDATE ticket_refund_requests 
       SET status = 'rejected', resolved_at = NOW() 
       WHERE id = $1 AND status = 'pending'`,
      [req.params.id]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Pending refund request not found' });
    }
    
    res.json({ ok: true, message: 'Refund rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
