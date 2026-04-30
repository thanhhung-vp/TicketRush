import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api.js';

const CATEGORIES = [
  { value: '', label: 'Tất cả' },
  { value: 'music', label: 'Live Music' },
  { value: 'sports', label: 'Thể thao' },
  { value: 'arts', label: 'Sân khấu & Nghệ thuật' },
  { value: 'conference', label: 'Hội nghị & Cộng đồng' },
  { value: 'comedy', label: 'Hài kịch' },
  { value: 'festival', label: 'Lễ hội' },
  { value: 'other', label: 'Khác' },
];

const CATEGORY_COLORS = {
  music:      'bg-pink-50 text-pink-600 border-pink-200',
  sports:     'bg-cyan-50 text-cyan-700 border-cyan-200',
  arts:       'bg-purple-50 text-purple-600 border-purple-200',
  conference: 'bg-blue-50 text-blue-600 border-blue-200',
  comedy:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  festival:   'bg-orange-50 text-orange-600 border-orange-200',
  other:      'bg-gray-100 text-gray-600 border-gray-200',
};

function formatDate(d) {
  const date = new Date(d);
  const day = date.getDate();
  const months = ['Th01','Th02','Th03','Th04','Th05','Th06','Th07','Th08','Th09','Th10','Th11','Th12'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('');
  const search = searchParams.get('search') || searchParams.get('q') || '';
  const tabsRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)   params.search   = search;
      if (category) params.category = category;
      const { data } = await api.get('/events', { params });
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const scrollTabs = (dir) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* ═══ Hero Banner Carousel (Contained within frame) ═══ */}
      <div className="rounded-2xl overflow-hidden mb-8 shadow-xl">
        <EventCarousel events={events} loading={loading} />
      </div>

      {/* Section title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Sự kiện nổi bật</h2>

        {/* Category tabs */}
        <div className="relative mb-8">
          <div ref={tabsRef}
            className="flex gap-8 overflow-x-auto scrollbar-hide border-b border-gray-300 pb-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value === category ? '' : cat.value)}
                className={`whitespace-nowrap text-sm font-medium pb-1 transition-colors border-b-2 -mb-[13px] ${
                  category === cat.value
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-gray-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollTabs(1)}
            className="absolute right-0 top-0 h-8 w-8 flex items-center justify-center bg-white/90 border border-gray-200 rounded-full shadow text-gray-400 hover:text-gray-700 transition text-lg"
            aria-label="Scroll categories"
          >
            ›
          </button>
        </div>

        {/* Results info */}
        {search && (
          <p className="text-sm text-gray-500 mb-4">
            Kết quả tìm kiếm cho "<span className="font-medium text-gray-700">{search}</span>"
            — {events.length} sự kiện
          </p>
        )}

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/10] bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-3">🎭</div>
            <p>Không tìm thấy sự kiện nào.</p>
            {(search || category) && (
              <button
                onClick={() => { setCategory(''); window.history.replaceState(null, '', '/'); }}
                className="mt-3 text-primary hover:underline text-sm"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        )}
    </div>
  );
}

function EventCard({ event }) {
  const catLabel = CATEGORIES.find(c => c.value === event.category)?.label || 'Khác';

  return (
    <Link to={`/events/${event.id}`} className="group block">
      {/* Image */}
      <div className="aspect-[16/10] rounded-lg overflow-hidden mb-3 bg-gray-200">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary/10 to-secondary/10">
            🎵
          </div>
        )}
      </div>

      {/* Category badge */}
      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border mb-2 ${
        CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other
      }`}>
        {catLabel}
      </span>

      {/* Location + Date */}
      <p className="text-sm text-gray-500 mb-1 truncate">
        {event.venue}, {formatDate(event.event_date)}
      </p>

      {/* Title */}
      <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 uppercase text-sm group-hover:text-primary transition-colors">
        {event.title}
      </h3>
    </Link>
  );
}

/* ═══════════ Banner Carousel ═══════════ */

const SLIDE_GRADIENTS = [
  'from-emerald-600 to-teal-500',
  'from-purple-700 to-pink-500',
  'from-blue-700 to-cyan-500',
  'from-orange-600 to-red-500',
  'from-indigo-700 to-violet-500',
  'from-rose-600 to-pink-400',
];

function EventCarousel({ events, loading }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const slides = events.slice(0, 6); // max 6 slides

  // Auto-play
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const goTo = (idx) => {
    setCurrent(idx);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 4000);
  };

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = () => goTo((current + 1) % slides.length);

  if (loading || slides.length === 0) {
    return (
      <div className="relative h-64 md:h-80 w-full bg-gradient-to-r from-primary via-purple-600 to-secondary animate-pulse">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg">Khám phá sự kiện</h1>
          <p className="text-base md:text-lg opacity-90 max-w-lg">Tìm vé cho hàng nghìn sự kiện trên khắp Việt Nam</p>
        </div>
      </div>
    );
  }

  const slide = slides[current];
  const gradient = SLIDE_GRADIENTS[current % SLIDE_GRADIENTS.length];

  return (
    <div className="relative w-full overflow-hidden group">
      {/* Slide content */}
      <div className={`relative h-[380px] md:h-[450px] bg-gradient-to-r ${gradient} transition-all duration-700`}>
        {/* Background poster image (blurred overlay) */}
        {slide.poster_url && (
          <img
            src={slide.poster_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 blur-sm"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Slide info */}
        <Link
          to={`/events/${slide.id}`}
          className="relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-start h-full max-w-6xl mx-auto px-8 md:px-16 gap-6 md:gap-12"
        >
          {/* Left: poster thumbnail (Fixed aspect ratio 3:4 for event posters) */}
          {slide.poster_url && (
            <div className="w-40 md:w-60 shrink-0 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 aspect-[3/4] bg-gray-900">
              <img src={slide.poster_url} alt={slide.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Right: text info */}
          <div className="text-white flex-1 text-center md:text-left">
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-white/20 border border-white/30 mb-4 uppercase tracking-wide">
              {CATEGORIES.find(c => c.value === slide.category)?.label || 'Sự kiện'}
            </span>
            <h2 className="text-2xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg line-clamp-3">
              {slide.title}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm md:text-base text-white/90">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                📅 {formatDate(slide.event_date)}
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                📍 {slide.venue}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-sm shadow-lg flex items-center justify-center text-white transition opacity-0 group-hover:opacity-100"
        aria-label="Previous"
      >
        <span className="text-2xl leading-none">‹</span>
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-sm shadow-lg flex items-center justify-center text-white transition opacity-0 group-hover:opacity-100"
        aria-label="Next"
      >
        <span className="text-2xl leading-none">›</span>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${
              i === current
                ? 'w-10 h-2.5 bg-white'
                : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
