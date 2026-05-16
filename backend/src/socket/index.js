import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { createVirtualQueuePresence } from '../utils/virtualQueuePresence.js';

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
  const queuePresence = createVirtualQueuePresence({ io });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.user = jwt.verify(token, config.jwt.secret);
    } catch {}
    next();
  });

  io.on('connection', (socket) => {
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('join:event', (eventId) => {
      const joinedEventId = queuePresence.join(eventId, socket.user?.id);
      if (joinedEventId) {
        socket.data.queueEventRooms ??= new Set();
        socket.data.queueEventRooms.add(joinedEventId);
      }
      socket.join(`event:${eventId}`);
    });

    socket.on('leave:event', (eventId) => {
      const normalizedEventId = eventId === null || eventId === undefined ? null : String(eventId).trim();
      if (normalizedEventId) {
        queuePresence.leave(normalizedEventId, socket.user?.id);
        socket.data.queueEventRooms?.delete(normalizedEventId);
      }
      socket.leave(`event:${eventId}`);
    });

    socket.on('disconnecting', () => {
      socket.data.queueEventRooms?.forEach(eventId => {
        queuePresence.leave(eventId, socket.user?.id);
      });
      socket.data.queueEventRooms?.clear();
    });
  });

  return io;
}
