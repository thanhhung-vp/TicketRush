import { useState, useEffect, useCallback } from 'react';
import { eventService } from '../../services/event.service.js';
import { EventCard } from '../../components/features/events/EventCard.jsx';
import { EventFilters } from '../../components/features/events/EventFilters.jsx';
import { PageSpinner } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';

const INITIAL_FILTERS = {
  search: '',
  category: '',
  location: '',
  dateFrom: '',
  dateTo: '',
};

export default function HomePage() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const fetchEvents = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = {};
      if (f.search)   params.search    = f.search;
      if (f.category) params.category  = f.category;
      if (f.location) params.location  = f.location;
      if (f.dateFrom) params.date_from = f.dateFrom;
      if (f.dateTo)   params.date_to   = f.dateTo;
      const data = await eventService.list(params);
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchEvents(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, fetchEvents]);

  const handleFilterChange = (partial) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const hasFilters =
    filters.search || filters.category || filters.location || filters.dateFrom || filters.dateTo;

  return (
    <PageContainer>
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Khám phá sự kiện
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Tìm vé cho hàng nghìn sự kiện âm nhạc, thể thao, nghệ thuật và giải trí hàng đầu.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-8">
        <EventFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {/* Result count */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        {loading ? (
          <span>Đang tìm kiếm...</span>
        ) : (
          <span>
            {events.length > 0
              ? `${events.length} sự kiện được tìm thấy`
              : hasFilters
              ? 'Không có kết quả phù hợp'
              : 'Chưa có sự kiện nào'}
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden animate-pulse"
            >
              <div className="aspect-[16/9] bg-gray-800" />
              <div className="px-5 py-4 space-y-3">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
                <div className="h-3 bg-gray-800 rounded w-1/3 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🎭</div>
          <p className="text-gray-400 text-lg mb-2">Không tìm thấy sự kiện nào.</p>
          {hasFilters && (
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="mt-3 text-blue-400 hover:text-blue-300 hover:underline text-sm transition"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
