import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../lib/api.js';

const POLL_INTERVAL = 5000; // ms

export default function WaitingRoomPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // { admitted, position, total }
  const [entered, setEntered] = useState(false);
  const pollRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect socket to listen for instant admission notification
    const socket = io('/', { auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;
    socket.on('queue:admitted', ({ eventId: eid }) => {
      if (eid === eventId) {
        clearInterval(pollRef.current);
        navigate(`/events/${eventId}`);
      }
    });

    // Enter queue
    api.post(`/queue/${eventId}/enter`).then(({ data }) => {
      setEntered(true);
      if (data.admitted) {
        navigate(`/events/${eventId}`, { replace: true });
        return;
      }
      setStatus(data);

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const { data: s } = await api.get(`/queue/${eventId}/status`);
          if (s.admitted) {
            clearInterval(pollRef.current);
            navigate(`/events/${eventId}`, { replace: true });
          } else {
            setStatus(s);
          }
        } catch {}
      }, POLL_INTERVAL);
    });

    return () => {
      clearInterval(pollRef.current);
      socket.disconnect();
    };
  }, [eventId]);

  if (!entered) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Đang tham gia hàng chờ...</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6">
        {/* Animated spinner */}
        <div className="flex justify-center">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Phòng chờ ảo</h1>
          <p className="text-gray-400">Lưu lượng truy cập đang cao. Hệ thống đang sắp xếp lượt cho bạn.</p>
        </div>

        {status && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
            <div className="text-5xl font-bold text-blue-400">#{status.position}</div>
            <p className="text-gray-300">Bạn đang ở vị trí thứ <strong>{status.position}</strong> trong hàng đợi</p>
            {status.total && (
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(5, ((status.total - status.position) / status.total) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-gray-500">Vui lòng không tải lại trang.</p>
            <p className="text-xs text-gray-600 animate-pulse">Tự động cập nhật mỗi 5 giây...</p>
          </div>
        )}
      </div>
    </div>
  );
}
