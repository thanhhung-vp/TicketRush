import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket/index.js';
import { startSeatReleaseWorker, sweepExpiredSeats } from './workers/seatRelease.js';
import { startVirtualQueueWorker } from './workers/virtualQueue.js';
import { startScheduledEventsWorker } from './workers/scheduledEvents.js';

import authRouter        from './routes/auth.js';
import eventsRouter      from './routes/events.js';
import seatsRouter       from './routes/seats.js';
import ordersRouter      from './routes/orders.js';
import adminRouter       from './routes/admin.js';
import newsRouter        from './routes/news.js';
import queueRouter       from './routes/queue.js';
import uploadRouter      from './routes/upload.js';
import paymentRouter     from './routes/payment.js';
import wishlistsRouter   from './routes/wishlists.js';
import reviewsRouter     from './routes/reviews.js';
import merchandiseRouter from './routes/merchandise.js';
import checkinRouter     from './routes/checkin.js';
import ticketRefundsRouter from './routes/ticketRefunds.js';
import ticketTransfersRouter from './routes/ticketTransfers.js';
import aiRouter             from './routes/ai.js';

const app = express();
const server = http.createServer(app);

// ── Global middleware ──────────────────────────────────────
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ── Rate limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many checkout requests, slow down' },
});

app.use(globalLimiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/orders/checkout', checkoutLimiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/events',      eventsRouter);
app.use('/api/seats',       seatsRouter);
app.use('/api/orders',      ordersRouter);
app.use('/api/admin',       adminRouter);
app.use('/api/news',        newsRouter);
app.use('/api/queue',       queueRouter);
app.use('/api/upload',      uploadRouter);
app.use('/api/payment',     paymentRouter);
app.use('/api/wishlists',   wishlistsRouter);
app.use('/api/reviews',     reviewsRouter);
app.use('/api/merchandise', merchandiseRouter);
app.use('/api/checkin',     checkinRouter);
app.use('/api/ticket-refunds',   ticketRefundsRouter);
app.use('/api/ticket-transfers', ticketTransfersRouter);
app.use('/api/ai',                aiRouter);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ── 404 / error handlers ───────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Socket.io ──────────────────────────────────────────────
const io = initSocket(server);
app.set('io', io);

// ── BullMQ worker ──────────────────────────────────────────
startSeatReleaseWorker(io);
startVirtualQueueWorker(io);
startScheduledEventsWorker();
setInterval(() => sweepExpiredSeats(io), 60_000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀  TicketRush backend → http://localhost:${PORT}`);
});
