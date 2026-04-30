import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SeatMap from '../components/SeatMap.jsx';

const CATEGORY_GRADIENTS = {
  music:      'from-purple-700 via-pink-600 to-rose-500',
  sports:     'from-emerald-700 via-green-600 to-teal-500',
  arts:       'from-fuchsia-700 via-purple-600 to-indigo-500',
  conference: 'from-blue-700 via-indigo-600 to-cyan-500',
  comedy:     'from-amber-600 via-yellow-500 to-orange-400',
  festival:   'from-orange-600 via-red-500 to-pink-500',
  other:      'from-slate-700 via-gray-600 to-slate-500',
};

function formatDateFull(d) {
  const date = new Date(d);
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day}/${month}/${year}`;
}

function formatTime(d) {
  const date = new Date(d);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatVND(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' VND';
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('seats');

  useEffect(() => {
    api.get(`/events/${id}`).then(r => setEvent(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;
  if (!event) return <div className="text-center py-20 text-red-500">Không tìm thấy sự kiện.</div>;

  const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS.other;
  const minPrice = event.zones?.length > 0 ? Math.min(...event.zones.map(z => Number(z.price))) : 0;
  const maxPrice = event.zones?.length > 0 ? Math.max(...event.zones.map(z => Number(z.price))) : 0;

  return (
    <div>
      {/* ═══════════ Hero Banner (CTicket style) ═══════════ */}
      <div className={`bg-gradient-to-r ${gradient} relative`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left: Poster */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-2xl bg-white/10">
                {event.poster_url ? (
                  <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl bg-white/5">🎵</div>
                )}
              </div>

              {/* CTA Button */}
              {!user ? (
                <button
                  onClick={() => navigate('/login')}
                  className="mt-4 w-full bg-[#E6007E] hover:bg-[#c4006a] text-white font-bold py-3.5 rounded-full transition shadow-lg text-sm"
                >
                  Đăng nhập để mua vé
                </button>
              ) : (
                <button
                  onClick={() => document.getElementById('seat-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-4 w-full bg-[#E6007E] hover:bg-[#c4006a] text-white font-bold py-3.5 rounded-full transition shadow-lg text-sm"
                >
                  Chọn vé ngay
                </button>
              )}
            </div>

            {/* Right: Event Info */}
            <div className="flex-1 text-white">
              {/* Status badge */}
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-400/30 mb-3">
                Đang mở bán
              </span>

              <h1 className="text-3xl lg:text-4xl font-extrabold mb-6 leading-tight drop-shadow">
                {event.title}
              </h1>

              {/* Date */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">📅</div>
                <div>
                  <p className="font-semibold text-white">{formatDateFull(event.event_date)}</p>
                  <p className="text-white/60 text-sm">Từ {formatTime(event.event_date)}</p>
                </div>
              </div>

              {/* Location */}
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 mb-4 group cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-xl transition"
                title="Mở Google Maps chỉ đường"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0 group-hover:bg-primary/50 transition-colors">📍</div>
                <div>
                  <p className="font-semibold text-white group-hover:text-blue-200 transition-colors">{event.venue}</p>
                  <p className="text-white/60 text-sm group-hover:underline">Xem bản đồ chỉ đường ↗</p>
                </div>
              </a>

              {/* Price range */}
              {minPrice > 0 && (
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">🎫</div>
                  <div>
                    <p className="font-semibold text-white">Giá vé</p>
                    <p className="text-white/60 text-sm">
                      Từ {formatVND(minPrice)} {maxPrice !== minPrice ? `đến ${formatVND(maxPrice)}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <p className="text-white/70 text-sm leading-relaxed mt-4 max-w-xl">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ Tabs ═══════════ */}
      <div className="border-b border-gray-200 bg-white sticky top-[57px] z-40">
        <div className="max-w-6xl mx-auto px-4 flex gap-8">
          {[
            { key: 'seats', label: 'Lịch sự kiện & Sơ đồ ghế' },
            { key: 'about', label: 'Thông tin sự kiện' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ Content ═══════════ */}
      <div className="max-w-6xl mx-auto px-4 py-8" id="seat-section">
        {activeTab === 'seats' ? (
          <div>
            {/* Venue info card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Lịch sự kiện & Sơ đồ ghế</h2>
              <p className="text-sm text-gray-500 mb-4">Vui lòng chọn khu vực để bắt đầu đặt vé</p>

              {/* Venue */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                  {event.poster_url ? (
                    <img src={event.poster_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📍</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{event.venue}</p>
                  <p className="text-sm text-gray-500">{formatDateFull(event.event_date)} · {formatTime(event.event_date)}</p>
                </div>
              </div>

              {/* Zones/Price table */}
              {event.zones?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Khu vực & Giá vé</h3>
                  <div className="grid gap-2">
                    {event.zones.map(z => (
                      <div key={z.id} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-lg">
                        <span className="flex items-center gap-3">
                          <span className="w-4 h-4 rounded" style={{ backgroundColor: z.color }} />
                          <span className="font-medium text-gray-800">{z.name}</span>
                          <span className="text-xs text-gray-400">
                            ({Number(z.available_seats || 0)}/{Number(z.total_seats || 0)} ghế trống)
                          </span>
                        </span>
                        <span className="font-bold text-gray-900">{formatVND(z.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Seat map */}
            <div className="bg-gray-950 rounded-2xl p-5 text-white">
              <SeatMap eventId={id} />
            </div>
          </div>
        ) : (
          /* About tab */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin sự kiện</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              <p>{event.description || 'Chưa có thông tin chi tiết.'}</p>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-24">Sự kiện:</span>
                <span className="font-medium text-gray-800">{event.title}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-24">Thời gian:</span>
                <span className="font-medium text-gray-800">{formatDateFull(event.event_date)} · {formatTime(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-24">Địa điểm:</span>
                <span className="font-medium text-gray-800">{event.venue}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-24">Giá vé:</span>
                <span className="font-medium text-gray-800">
                  {minPrice > 0 ? `Từ ${formatVND(minPrice)}` : 'Liên hệ'}
                  {maxPrice !== minPrice ? ` đến ${formatVND(maxPrice)}` : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
