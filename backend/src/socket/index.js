import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow anonymous (read-only)
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {}
    next();
  });

  io.on('connection', (socket) => {
    // Join personal room for queue notifications
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Join a per-event room to receive seat updates
    socket.on('join:event', (eventId) => {
      socket.join(`event:${eventId}`);
    });

    socket.on('leave:event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });
  });

  return io;
}
