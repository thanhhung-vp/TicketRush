import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmittedSocket } from '../../hooks/useAdmittedSocket.js';
import api from '../../services/api.js';

const POLL_INTERVAL = 5000;

export default function WaitingRoomPage() {
  const { eventId } = useParams();
  const navigate    = useNavigate();

  const [status, setStatus]   = useState(null); // { admitted, position, total }
  const [entered, setEntered] = useState(false);
  const [error, setError]     = useState('');
  const pollRef               = useRef(null);

  // Socket: instant admission notification
  useAdmittedSocket((admittedEventId) => {
    if (admittedEventId === eventId) {
      clearInterval(pollRef.current);
      navigate(`/events/${eventId}`, { replace: true });
    }
  });

  useEffect(() => {
    let cancelled = false;

    const enter = async () => {
      try {
        const { data } = await api.post(`/queue/${eventId}/enter`);
        const payload  = data.data ?? data; // handle both wrapped and bare responses

        if (cancelled) return;
        setEntered(true);

        if (payload.admitted) {
          navigate(`/events/${eventId}`, { replace: true });
          return;
        }

        setStatus(payload);

        // Start polling for queue position updates
        pollRef.current = setInterval(async () => {
          try {
            const { data: resp } = await api.get(`/queue/${eventId}/status`);
            const s = resp.data ?? resp;
            if (cancelled) return;
            if (s.admitted) {
              clearInterval(pollRef.current);
              navigate(`/events/${eventId}`, { replace: true });
            } else {
              setStatus(s);
            }
          } catch {
            // keep polling silently
          }
        }, POLL_INTERVAL);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Không thể tham gia hàng chờ.');
          setEntered(true);
        }
      }
    };

    enter();

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [eventId, navigate]);

  if (!entered) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p>Đang tham gia hàng chờ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:underline text-sm"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const progress = status?.total > 0
    ? Math.max(5, ((status.total - status.position) / status.total) * 100)
    : 5;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-8">
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Phòng chờ ảo</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Lưu lượng truy cập đang cao. Hệ thống đang sắp xếp lượt vào cho bạn.
          </p>
        </div>

        {/* Position card */}
        {status && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="text-5xl font-extrabold text-blue-400">
              #{status.position}
            </div>
            <p className="text-gray-300 text-sm">
              Bạn đang ở vị trí thứ{' '}
              <strong className="text-white">{status.position}</strong>{' '}
              trong hàng đợi
              {status.total ? ` / ${status.total} người` : ''}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500">Vui lòng không tải lại trang.</p>
              <p className="text-xs text-gray-600 animate-pulse">
                Tự động cập nhật mỗi 5 giây…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
