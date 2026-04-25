import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

function formatDate(d) {
  return new Date(d).toLocaleString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.venue.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sự kiện nổi bật</h1>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm sự kiện, địa điểm..."
          className="mt-4 w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400">Không có sự kiện nào.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }) {
  const availablePct = event.total_seats > 0
    ? Math.round((event.available_seats / event.total_seats) * 100)
    : 0;

  return (
    <Link to={`/events/${event.id}`} className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-900/20">
      <div className="h-44 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center overflow-hidden">
        {event.poster_url
          ? <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          : <span className="text-6xl">🎵</span>
        }
      </div>
      <div className="p-5">
        <h2 className="font-bold text-lg leading-tight mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
          {event.title}
        </h2>
        <p className="text-gray-400 text-sm mb-1">📍 {event.venue}</p>
        <p className="text-gray-400 text-sm mb-3">📅 {formatDate(event.event_date)}</p>
        <div className="flex items-center justify-between text-xs">
          <span className={`px-2 py-1 rounded-full font-medium ${availablePct > 20 ? 'bg-green-900/50 text-green-400' : availablePct > 0 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
            {event.available_seats > 0 ? `Còn ${event.available_seats} ghế` : 'Hết vé'}
          </span>
          <span className="text-gray-500">{event.total_seats} ghế</span>
        </div>
      </div>
    </Link>
  );
}
