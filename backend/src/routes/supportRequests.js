import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';

const router = Router();

const supportRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  type: z.enum(['account', 'technical', 'order', 'payment', 'other']),
  message: z.string().trim().min(10).max(2000),
});

router.post('/', async (req, res) => {
  const parsed = supportRequestSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { name, email, type, message } = parsed.data;

  try {
    const { rows } = await pool.query(
      `INSERT INTO support_requests (name, email, type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status, created_at`,
      [name, email.toLowerCase(), type, message]
    );

    res.status(201).json({ ok: true, request: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
