import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SeatMap from '../components/SeatMap.jsx';

function formatDate(d) {
  return new Date(d).toLocaleString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/events/${id}`).then(r => setEvent(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;
  if (!event) return <div className="text-center py-20 text-red-400">Không tìm thấy sự kiện.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: info */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 sticky top-4">
            <div className="h-56 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
              {event.poster_url
                ? <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
                : <span className="text-7xl">🎵</span>}
            </div>
            <div className="p-6 space-y-3">
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-gray-400 text-sm leading-relaxed">{event.description}</p>
              <div className="border-t border-gray-800 pt-3 space-y-2 text-sm">
                <p><span className="text-gray-500">Địa điểm:</span> <span>{event.venue}</span></p>
                <p><span className="text-gray-500">Thời gian:</span> <span>{formatDate(event.event_date)}</span></p>
              </div>
              <div className="border-t border-gray-800 pt-3">
                <p className="text-sm text-gray-500 mb-2">Giá vé theo khu</p>
                {event.zones?.map(z => (
                  <div key={z.id} className="flex items-center justify-between text-sm py-1">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.color }} />
                      {z.name}
                    </span>
                    <span className="font-medium text-blue-400">{formatVND(z.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: seat map */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Chọn ghế ngồi</h2>
          {!user && (
            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-4 text-sm text-yellow-300">
              Vui lòng <button onClick={() => navigate('/login')} className="underline font-medium">đăng nhập</button> để đặt vé.
            </div>
          )}
          <SeatMap eventId={id} />
        </div>
      </div>
    </div>
  );
}
