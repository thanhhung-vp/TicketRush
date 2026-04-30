import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

/** Connects socket for queue admission events. Calls onAdmitted(eventId) when admitted. */
export function useAdmittedSocket(onAdmitted) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/', {
      auth: { token: localStorage.getItem('accessToken') || localStorage.getItem('token') },
    });
    socketRef.current = socket;
    socket.on('queue:admitted', ({ eventId }) => onAdmitted(eventId));
    return () => socket.disconnect();
  }, []);

  return socketRef;
}
