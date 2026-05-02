import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SeatMap from '../components/SeatMap.jsx';

const CATEGORY_GRADIENTS = {
  music:       'from-purple-700 via-pink-600 to-rose-500',
  fan_meeting: 'from-rose-600 via-pink-500 to-fuchsia-500',
  merchandise: 'from-amber-600 via-orange-500 to-yellow-400',
  arts:        'from-fuchsia-700 via-purple-600 to-indigo-500',
  sports:      'from-emerald-700 via-green-600 to-teal-500',
  conference:  'from-blue-700 via-indigo-600 to-cyan-500',
  education:   'from-teal-600 via-cyan-500 to-sky-400',
  nightlife:   'from-indigo-700 via-violet-600 to-purple-500',
  livestream:  'from-sky-600 via-blue-500 to-cyan-400',
  travel:      'from-teal-700 via-emerald-600 to-green-500',
  other:       'from-slate-700 via-gray-600 to-slate-500',
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

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
  else { ctx.rect(x, y, w, h); }
}

function drawStagePath(ctx, s, x, y, w, h) {
  ctx.beginPath();
  if (s.shape === 'trapezoid') {
    const off = w * 0.16;
    ctx.moveTo(x+off,y); ctx.lineTo(x+w-off,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath();
  } else if (s.shape === 'ellipse') {
    ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
  } else if (s.shape === 'semicircle') {
    ctx.arc(x+w/2, y+h, w/2, Math.PI, 0, false); ctx.closePath();
  } else { rrect(ctx, x, y, w, h, 4); }
}

function drawZonePathCanvas(ctx, shape, x, y, w, h) {
  ctx.beginPath();
  if (shape === 'trapezoid') {
    const off = w * 0.15;
    ctx.moveTo(x+off,y); ctx.lineTo(x+w-off,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath();
  } else if (shape === 'fan') {
    const cx = x+w/2, cy = y-h*0.3;
    const outerR = Math.hypot(w/2, h-(-h*0.3));
    const innerR = outerR * 0.38;
    const aR = Math.atan2(y+h-cy, x+w-cx);
    const aL = Math.atan2(y+h-cy, x-cx);
    ctx.arc(cx, cy, outerR, aL, aR, false);
    ctx.arc(cx, cy, innerR, aR, aL, true);
    ctx.closePath();
  } else if (shape === 'circle') {
    ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
  } else if (shape === 'diamond') {
    ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(x+w/2,y+h); ctx.lineTo(x,y+h/2); ctx.closePath();
  } else if (shape === 'triangle') {
    ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath();
  } else if (shape === 'pentagon') {
    const cx=x+w/2,cy=y+h/2,a=2*Math.PI/5; ctx.beginPath();
    for(let i=0;i<5;i++){const px=cx+(w/2)*Math.cos(-Math.PI/2+i*a),py=cy+(h/2)*Math.sin(-Math.PI/2+i*a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
    ctx.closePath();
  } else if (shape === 'hexagon') {
    const cx=x+w/2,cy=y+h/2; ctx.beginPath();
    for(let i=0;i<6;i++){const px=cx+(w/2)*Math.cos(i*Math.PI/3),py=cy+(h/2)*Math.sin(i*Math.PI/3);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
    ctx.closePath();
  } else { rrect(ctx, x, y, w, h, 6); }
}

function SeatmapPreview({ event, zoom }) {
  const canvasRef = useRef();
  const hasLayout = Boolean(event.layout_json?.zones?.length);

  useEffect(() => {
    if (!hasLayout) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = (posterImg) => {
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const layout = event.layout_json;
      const srcW = layout.canvas?.width || 860;
      const srcH = layout.canvas?.height || 540;
      const sx = W / srcW, sy = H / srcH;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#f5f4f0';
      ctx.fillRect(0, 0, W, H);

      // Poster background
      if (posterImg) {
        ctx.globalAlpha = 0.15;
        ctx.drawImage(posterImg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Grid
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
      for (let x = 0; x <= srcW; x += 40) { ctx.beginPath(); ctx.moveTo(x*sx,0); ctx.lineTo(x*sx,H); ctx.stroke(); }
      for (let y = 0; y <= srcH; y += 40) { ctx.beginPath(); ctx.moveTo(0,y*sy); ctx.lineTo(W,y*sy); ctx.stroke(); }

      // Stages
      for (const s of layout.stages || []) {
        const x=s.x*sx, y=s.y*sy, w=s.width*sx, h=s.height*sy;
        const grad = ctx.createLinearGradient(x,y,x,y+h);
        grad.addColorStop(0,'#4c3b8a'); grad.addColorStop(1,'#1a1535');
        ctx.fillStyle = grad; ctx.strokeStyle = 'rgba(167,139,250,0.7)'; ctx.lineWidth = 1.5;
        drawStagePath(ctx, s, x, y, w, h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = `bold ${Math.round(11*Math.min(sx,sy))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(s.label || 'SÂN KHẤU', x+w/2, y+h/2+4);
      }

      // Zones
      for (const z of layout.zones) {
        const x=z.x*sx, y=z.y*sy, w=z.width*sx, h=z.height*sy;
        const c = z.color || '#3B82F6';
        const isGa = Boolean(z.ga);
        ctx.fillStyle = c + (isGa ? '45' : '28'); ctx.strokeStyle = c; ctx.lineWidth = 1.5;
        drawZonePathCanvas(ctx, z.shape||'rect', x, y, w, h);
        ctx.fill(); ctx.stroke();
        const scale = Math.min(sx,sy);
        ctx.fillStyle = c;
        ctx.font = `bold ${Math.round(12*scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(z.name, x+w/2, y+h/2 - 6*scale);
        ctx.fillStyle = c+'aa';
        ctx.font = `${Math.round(9*scale)}px sans-serif`;
        ctx.fillText(isGa ? `${(z.rows||1)*(z.cols||8)} vé tự do` : `${(z.rows||5)*(z.cols||8)} ghế`, x+w/2, y+h/2 + 7*scale);
      }
    };

    if (event.poster_url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => draw(img);
      img.onerror = () => draw(null);
      img.src = event.poster_url;
    } else {
      draw(null);
    }
  }, [event, hasLayout]);

  // No layout → show poster or empty
  if (!hasLayout) {
    if (event.poster_url) {
      return (
        <img src={event.poster_url} alt="Sơ đồ chỗ ngồi"
          draggable={false}
          className="select-none max-w-full max-h-full object-contain"
          style={{ transform:`scale(${zoom})`, transformOrigin:'center center', transition:'transform 0.2s ease' }}
        />
      );
    }
    return (
      <div className="text-gray-400 text-sm flex flex-col items-center gap-3">
        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Chưa có sơ đồ chỗ ngồi
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} width={760} height={480}
      style={{ width:'100%', height:'auto', display:'block',
        transform:`scale(${zoom})`, transformOrigin:'center center', transition:'transform 0.2s ease' }} />
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('seats');
  const [copied, setCopied] = useState(false);
  const [showSeatmap, setShowSeatmap] = useState(false);
  const [seatmapZoom, setSeatmapZoom] = useState(1);

  useEffect(() => {
    api.get(`/events/${id}`).then(r => setEvent(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Đang tải...</div>;
  if (!event) return <div className="text-center py-20 text-red-500">Không tìm thấy sự kiện.</div>;

  const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS.other;
  const minPrice = event.zones?.length > 0 ? Math.min(...event.zones.map(z => Number(z.price))) : 0;
  const maxPrice = event.zones?.length > 0 ? Math.max(...event.zones.map(z => Number(z.price))) : 0;

  const isPast     = new Date(event.event_date) < new Date();
  const isClosed   = event.status === 'ended' || isPast;
  const isSoldOut  = !isClosed && event.zones?.length > 0 && event.zones.every(z => Number(z.available_seats) === 0);
  const eventStatus = isClosed ? 'ended' : isSoldOut ? 'soldout' : 'onsale';

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
              {eventStatus === 'ended' ? (
                <button disabled className="mt-4 w-full bg-gray-500/60 text-white/60 font-bold py-3.5 rounded-full text-sm cursor-not-allowed">
                  Sự kiện đã kết thúc
                </button>
              ) : eventStatus === 'soldout' ? (
                <button disabled className="mt-4 w-full bg-red-500/70 text-white/80 font-bold py-3.5 rounded-full text-sm cursor-not-allowed">
                  Đã hết vé
                </button>
              ) : !user ? (
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
              {/* Status badge + Wishlist */}
              <div className="flex items-center gap-3 mb-3">
                {eventStatus === 'onsale' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Đang mở bán
                  </span>
                )}
                {eventStatus === 'soldout' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Đã bán hết vé
                  </span>
                )}
                {eventStatus === 'ended' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Đã đóng
                  </span>
                )}
              </div>

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

              {/* Share buttons */}
              <div className="flex items-center gap-3 mt-5">
                {/* Facebook Share */}
                <button
                  onClick={() => {
                    const url = window.location.href;
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                      'facebook-share',
                      'width=580,height=400'
                    );
                  }}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="Chia sẻ lên Facebook"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12a10 10 0 10-11.563 9.876v-6.988H7.9V12h2.537V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.888H13.56v6.988A10.003 10.003 0 0022 12z"/>
                  </svg>
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className={`w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                    copied ? 'bg-green-500/30 hover:bg-green-500/40' : 'bg-white/15 hover:bg-white/25'
                  }`}
                  title={copied ? 'Đã sao chép!' : 'Sao chép liên kết'}
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                  )}
                </button>
                {copied && (
                  <span className="text-xs text-green-200 font-medium animate-pulse">Đã sao chép!</span>
                )}
              </div>
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
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{event.venue}</p>
                  <p className="text-sm text-gray-500">{formatDateFull(event.event_date)} · {formatTime(event.event_date)}</p>
                </div>
                <button
                  onClick={() => { setShowSeatmap(true); setSeatmapZoom(1); }}
                  className="shrink-0 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 rounded-full px-4 py-1.5 transition"
                >
                  Xem sơ đồ
                </button>
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
              <SeatMap eventId={id} layoutJson={event.layout_json} />
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

      {/* ═══════════ Seatmap Modal ═══════════ */}
      {showSeatmap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowSeatmap(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-base">{event.venue}</p>
                <p className="text-sm text-gray-500 mt-0.5">{formatDateFull(event.event_date)} · {formatTime(event.event_date)}</p>
              </div>
              <button
                onClick={() => setShowSeatmap(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shrink-0 ml-4 mt-0.5"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Seatmap canvas with zoom */}
            <div className="relative overflow-hidden rounded-b-2xl" style={{ height: '420px', background: '#f5f4f0' }}>
              <div className="w-full h-full overflow-auto flex items-center justify-center">
                <SeatmapPreview event={event} zoom={seatmapZoom} />
              </div>

              {/* Zoom controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
                <button
                  onClick={() => setSeatmapZoom(z => Math.min(z + 0.25, 3))}
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition text-gray-700 font-bold text-lg"
                  title="Phóng to"
                >
                  +
                </button>
                <button
                  onClick={() => setSeatmapZoom(z => Math.max(z - 0.25, 0.5))}
                  className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition text-gray-700 font-bold text-lg"
                  title="Thu nhỏ"
                >
                  −
                </button>
                {seatmapZoom !== 1 && (
                  <button
                    onClick={() => setSeatmapZoom(1)}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                    title="Đặt lại"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Zoom level indicator */}
              <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                {Math.round(seatmapZoom * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
