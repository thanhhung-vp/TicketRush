import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Redis adapter — broadcasts reach every Node.js instance behind a load balancer
  const redisOpts = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
  };
  const pubClient = new Redis(redisOpts);
  const subClient = new Redis(redisOpts);

  pubClient.on('error', err => console.error('[socket pub]', err.message));
  subClient.on('error', err => console.error('[socket sub]', err.message));

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {}
    next();
  });

  io.on('connection', (socket) => {
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('join:event', (eventId) => {
      socket.join(`event:${eventId}`);
    });

    socket.on('leave:event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });
  });

  return io;
}
