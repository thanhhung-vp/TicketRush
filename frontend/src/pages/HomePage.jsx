import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';

const PAGE_SIZE = 12;

// Only values — labels resolved via t() inside component
const CATEGORY_KEYS = [
  { value: '',            key: null },
  { value: 'music',       key: 'music' },
  { value: 'fan_meeting', key: 'fan_meeting' },
  { value: 'merchandise', key: 'merchandise' },
  { value: 'arts',        key: 'arts' },
  { value: 'sports',      key: 'sports' },
  { value: 'conference',  key: 'conference' },
  { value: 'education',   key: 'education' },
  { value: 'nightlife',   key: 'nightlife' },
  { value: 'livestream',  key: 'livestream' },
  { value: 'travel',      key: 'travel' },
];

const CATEGORY_COLORS = {
  music:       'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  fan_meeting: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  merchandise: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  arts:        'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  sports:      'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  conference:  'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  education:   'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  nightlife:   'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  livestream:  'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  travel:      'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  other:       'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

function formatDate(d) {
  const date = new Date(d);
  const day = date.getDate();
  const months = ['Th01','Th02','Th03','Th04','Th05','Th06','Th07','Th08','Th09','Th10','Th11','Th12'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

const SORT_KEYS = [
  { value: 'date',       key: 'sortDate' },
  { value: 'newest',     key: 'sortNewest' },
  { value: 'price_asc',  key: 'sortPriceAsc' },
  { value: 'price_desc', key: 'sortPriceDesc' },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents]   = useState([]);
  const [bannerEvents, setBannerEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const tabsRef = useRef(null);

  // Translated labels — re-computed on language change
  const CATEGORIES = CATEGORY_KEYS.map(c => ({
    ...c,
    label: c.key ? t(`event.categories.${c.key}`) : t('common.all'),
  }));
  const SORT_OPTIONS = SORT_KEYS.map(o => ({ ...o, label: t(`home.${o.key}`) }));

  const search    = searchParams.get('search') || searchParams.get('q') || '';
  const category  = searchParams.get('category') || '';
  const sort      = searchParams.get('sort') || 'date';
  const dateFrom  = searchParams.get('date_from') || '';
  const dateTo    = searchParams.get('date_to') || '';

  const setParam = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBannerEvents() {
      if (controller.signal.aborted) return;
      setBannerLoading(true);

      // 1. Try featured endpoint
      let banner = [];
      try {
        const { data } = await api.get('/events/featured', { signal: controller.signal });
        if (Array.isArray(data)) banner = data;
      } catch { /* featured may not exist — fall through */ }

      // Filter out closed/past events from banner
      const now = new Date();
      banner = banner.filter(e => e.status !== 'ended' && new Date(e.event_date) >= now);

      // 2. Fall back to upcoming events if featured is empty or all closed
      if (banner.length === 0 && !controller.signal.aborted) {
        try {
          const { data } = await api.get('/events', { params: { sort: 'date' }, signal: controller.signal });
          if (Array.isArray(data))
            banner = data.filter(e => e.status !== 'ended' && new Date(e.event_date) >= now).slice(0, 6);
        } catch { /* ignore */ }
      }

      if (!controller.signal.aborted) {
        setBannerEvents(banner);
        setBannerLoading(false);
      }
    }

    fetchBannerEvents();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setHasMore(false);
      try {
        const params = { limit: PAGE_SIZE, offset: 0 };
        if (search)   params.search    = search;
        if (category) params.category  = category;
        if (sort)     params.sort      = sort;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo)   params.date_to   = dateTo;
        const { data } = await api.get('/events', { params, signal: controller.signal });
        const list = Array.isArray(data) ? data : [];
        setEvents(list);
        setHasMore(list.length === PAGE_SIZE);
      } catch {
        if (!controller.signal.aborted) setEvents([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, category, sort, dateFrom, dateTo]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = { limit: PAGE_SIZE, offset: events.length };
      if (search)   params.search    = search;
      if (category) params.category  = category;
      if (sort)     params.sort      = sort;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const { data } = await api.get('/events', { params });
      const newList = Array.isArray(data) ? data : [];
      setEvents(prev => [...prev, ...newList]);
      setHasMore(newList.length === PAGE_SIZE);
    } catch {}
    finally { setLoadingMore(false); }
  };

  const scrollTabs = (dir) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  const activeFilterCount = [category, dateFrom, dateTo, sort !== 'date' ? sort : ''].filter(Boolean).length;
  const isInitialLoading = loading && events.length === 0;
  const isRefreshing = loading && events.length > 0;

  const clearFilters = () => setSearchParams({});

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* ═══ Hero Banner Carousel (Contained within frame) ═══ */}
      <div className="rounded-2xl overflow-hidden mb-8 shadow-xl">
        <EventCarousel events={bannerEvents} loading={bannerLoading} />
      </div>

      {/* Section title + filter toggle */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('home.upcomingEvents')}</h2>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            showFilters || activeFilterCount > 0
              ? 'bg-primary text-white border-primary'
              : 'bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 border-gray-300 dark:border-dark-border hover:border-gray-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {t('common.filter')}{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
      </div>

        {/* Category tabs */}
        <div className="relative mb-4">
          <div className="flex items-center">
            {/* Left scroll button */}
            <button
              onClick={() => scrollTabs(-1)}
              className="shrink-0 w-7 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition shadow-sm mr-1"
              aria-label="Scroll left"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <div ref={tabsRef}
              className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-dark-border flex-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setParam('category', cat.value === category ? '' : cat.value)}
                  className={`whitespace-nowrap text-sm px-4 pb-3 pt-1 transition-all border-b-2 -mb-px ${
                    category === cat.value
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200 font-normal'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Right scroll button */}
            <button
              onClick={() => scrollTabs(1)}
              className="shrink-0 w-7 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition shadow-sm ml-1"
              aria-label="Scroll right"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Sort */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t('home.sortBy')}</label>
                <select
                  value={sort}
                  onChange={e => setParam('sort', e.target.value === 'date' ? '' : e.target.value)}
                  className="w-full border border-gray-300 dark:border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t('home.filterByDate')} ↑</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setParam('date_from', e.target.value)}
                  className="w-full border border-gray-300 dark:border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Date to */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t('home.filterByDate')} ↓</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setParam('date_to', e.target.value)}
                  className="w-full border border-gray-300 dark:border-dark-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:text-red-600 font-medium transition hover:underline"
                >
                  {t('common.clear')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results info */}
        {(search || category || dateFrom || dateTo) && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <p className="text-sm text-gray-500">
              {search && <>Kết quả cho "<span className="font-medium text-gray-700">{search}</span>" — </>}
              {isRefreshing ? (
                <span className="font-medium text-gray-700">Đang cập nhật...</span>
              ) : (
                <><span className="font-medium text-gray-700">{events.length}</span> sự kiện</>
              )}
            </p>
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium transition"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {/* Events grid */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/10] bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">🎭</div>
            <p>{t('common.noResults')}</p>
            {(search || category || dateFrom || dateTo) && (
              <button
                onClick={clearFilters}
                className="mt-3 text-primary hover:underline text-sm"
              >
                {t('common.clear')}
              </button>
            )}
          </div>
        ) : (
          <div className="relative" aria-busy={isRefreshing}>
            <div className={`grid grid-cols-1 gap-6 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-4 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
              {[
                ...events.filter(e => e.status !== 'ended' && new Date(e.event_date) >= new Date()),
                ...events.filter(e => e.status === 'ended' || new Date(e.event_date) < new Date()),
              ].map(event => <EventCard key={event.id} event={event} />)}
            </div>
            {isRefreshing && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-2">
                <span className="rounded-full border border-gray-200 dark:border-dark-border bg-white/90 dark:bg-dark-card/90 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-sm backdrop-blur">
                  {t('common.loading')}
                </span>
              </div>
            )}
            <div className="flex justify-center mt-10">
              {hasMore ? (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-2.5 rounded-full border border-gray-300 dark:border-dark-border text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      {t('common.loading')}
                    </span>
                  ) : t('home.loadMore')}
                </button>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-600">{t('home.noMore')}</p>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

function eventStatusInfo(event) {
  const isPast = new Date(event.event_date) < new Date();
  if (event.status === 'ended' || isPast) return { label: 'Đã đóng', cls: 'bg-gray-800/80 text-gray-200', dot: 'bg-gray-400' };
  if (event.status === 'scheduled') return { label: 'Sắp mở bán', cls: 'bg-blue-700/85 text-white', dot: 'bg-blue-300 animate-pulse' };
  if (Number(event.available_seats) === 0)  return { label: 'Hết vé', cls: 'bg-red-600/85 text-white',    dot: 'bg-red-300' };
  return { label: 'Đang mở bán', cls: 'bg-green-600/85 text-white', dot: 'bg-green-300 animate-pulse' };
}

function useSaleCountdown(saleStartAt) {
  const [remaining, setRemaining] = useState(() => {
    if (!saleStartAt) return null;
    return Math.max(0, Math.floor((new Date(saleStartAt) - Date.now()) / 1000));
  });
  useEffect(() => {
    if (!saleStartAt) return;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(saleStartAt) - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [saleStartAt]);
  return remaining;
}

function EventCard({ event }) {
  const { t } = useTranslation();
  const catKey = CATEGORY_KEYS.find(c => c.value === event.category);
  const catLabel = catKey?.key ? t(`event.categories.${catKey.key}`) : t('event.categories.other');
  const statusInfo = eventStatusInfo(event);
  const isPast       = new Date(event.event_date) < new Date();
  const isClosed     = event.status === 'ended' || isPast;
  const isScheduled  = event.status === 'scheduled';
  const isDimmed     = isClosed || Number(event.available_seats) === 0;
  const countdown    = useSaleCountdown(isScheduled ? event.sale_start_at : null);

  const fmtCountdown = (secs) => {
    if (secs === null) return null;
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}${t('event.countdown.days')} ${h}${t('event.countdown.hours')}`;
    if (h > 0) return `${h}${t('event.countdown.hours')} ${m}${t('event.countdown.mins')}`;
    return `${m}${t('event.countdown.mins')} ${s}${t('event.countdown.secs')}`;
  };

  return (
    <Link to={`/events/${event.id}`} className={`group block ${isClosed ? 'opacity-60' : ''}`}>
      {/* Image */}
      <div className="aspect-[16/10] rounded-lg overflow-hidden mb-3 bg-gray-200 dark:bg-gray-800 relative">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isDimmed ? 'brightness-50' : ''}`}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary/10 to-secondary/10 ${isDimmed ? 'brightness-50' : ''}`}>
            🎵
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${statusInfo.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
          {statusInfo.label}
        </span>
      </div>

      {/* Category badge */}
      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border mb-2 ${
        CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other
      }`}>
        {catLabel}
      </span>

      {/* Countdown badge for scheduled events */}
      {isScheduled && countdown !== null && countdown > 0 && (
        <div className="flex items-center gap-1 mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('event.countdown.label')}: {fmtCountdown(countdown)}
        </div>
      )}

      {/* Title */}
      <h3 className="font-bold text-[var(--color-text)] leading-snug line-clamp-2 uppercase text-sm mb-2 group-hover:text-primary transition-colors">
        {event.title}
      </h3>

      {/* Date & Location */}
      <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium mt-auto">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{formatDate(event.event_date)}</span>
        </div>
        <div
          className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`, '_blank');
          }}
        >
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate hover:underline cursor-pointer">{event.venue}</span>
        </div>
      </div>
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
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const slides = events.slice(0, 6);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % slides.length), 4500);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const goTo = (idx) => {
    setCurrent(idx);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % slides.length), 4500);
  };

  const goPrev = () => goTo((current - 1 + slides.length) % slides.length);
  const goNext = () => goTo((current + 1) % slides.length);

  if (loading) {
    return (
      <div className="relative h-64 md:h-80 w-full bg-gradient-to-r from-primary via-purple-600 to-secondary animate-pulse">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg">{t('home.heroTitle')}</h1>
          <p className="text-base md:text-lg opacity-90 max-w-lg">{t('home.heroSubtitle')}</p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative h-64 w-full bg-gradient-to-r from-primary via-purple-600 to-secondary md:h-80">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <h1 className="mb-3 text-3xl font-extrabold drop-shadow-lg md:text-5xl">{t('home.heroTitle')}</h1>
          <p className="max-w-lg text-base opacity-90 md:text-lg">{t('home.heroSubtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden group">
      <div className="relative h-[380px] md:h-[450px]">
        {slides.map((slide, i) => {
          const isActive = i === current;
          const gradient = SLIDE_GRADIENTS[i % SLIDE_GRADIENTS.length];
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 bg-gradient-to-r ${gradient} transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Ken Burns zoom on image */}
              {slide.poster_url ? (
                <img
                  src={slide.poster_url}
                  alt=""
                  className={`absolute inset-0 w-full h-full object-cover object-top transition-transform ease-linear ${
                    isActive ? 'duration-[8000ms] scale-110' : 'duration-700 scale-100'
                  }`}
                />
              ) : (
                <div className="absolute inset-0 opacity-50 mix-blend-overlay" />
              )}

              {/* Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Text — slides up when active */}
              <Link
                to={`/events/${slide.id}`}
                className="absolute inset-0 z-10 flex flex-col justify-end max-w-6xl mx-auto px-8 md:px-16 pb-10"
              >
                <div className={`text-white max-w-2xl transition-transform duration-700 ease-out delay-200 ${
                  isActive ? 'translate-y-0' : 'translate-y-8'
                }`}>
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/80 backdrop-blur-sm mb-3 uppercase tracking-wide">
                    {slide.category ? t(`event.categories.${slide.category}`) : t('home.upcomingEvents')}
                  </span>
                  <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight drop-shadow-lg line-clamp-2">
                    {slide.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-white/90 font-medium">
                    <span className="flex items-center gap-1.5 drop-shadow">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(slide.event_date)}
                    </span>
                    <span
                      className="flex items-center gap-1.5 drop-shadow hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slide.venue)}`, '_blank');
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {slide.venue}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 backdrop-blur-sm shadow-lg flex items-center justify-center text-white transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 hover:scale-110"
        aria-label="Previous"
      >
        <span className="text-2xl leading-none">‹</span>
      </button>
      <button
        onClick={goNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 backdrop-blur-sm shadow-lg flex items-center justify-center text-white transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 hover:scale-110"
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
            className={`rounded-full transition-all duration-300 ${
              i === current ? 'w-10 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
