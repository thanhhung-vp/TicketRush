import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { initSocket } from './socket/index.js';
import { startSeatReleaseWorker, sweepExpiredSeats } from './workers/seatRelease.js';

import authRouter   from './routes/auth.js';
import eventsRouter from './routes/events.js';
import seatsRouter  from './routes/seats.js';
import ordersRouter from './routes/orders.js';
import adminRouter  from './routes/admin.js';
import queueRouter  from './routes/queue.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',   authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/seats',  seatsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin',  adminRouter);
app.use('/api/queue',  queueRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Socket.io
const io = initSocket(server);

// Make io accessible in routes (for broadcasting after seat operations)
app.set('io', io);

// BullMQ worker
startSeatReleaseWorker(io);

// Fallback sweep every 60 seconds (catches any jobs BullMQ might miss)
setInterval(() => sweepExpiredSeats(io), 60_000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀  TicketRush backend running on http://localhost:${PORT}`);
});
