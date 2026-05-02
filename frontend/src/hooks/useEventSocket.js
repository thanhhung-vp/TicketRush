import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Connects to Socket.io, joins event room, calls onSeatsUpdated when seats change.
 * Cleans up on unmount.
 */
export function useEventSocket(eventId, onSeatsUpdated) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!eventId) return;

    const socket = io('/', {
      auth: { token: localStorage.getItem('accessToken') || localStorage.getItem('token') },
    });
    socketRef.current = socket;

    socket.emit('join:event', eventId);
    socket.on('seats:updated', onSeatsUpdated);

    return () => {
      socket.emit('leave:event', eventId);
      socket.disconnect();
    };
  }, [eventId]);

  return socketRef;
}
