import { useState, useEffect, useCallback } from 'react';
import { Ticket } from 'lucide-react';
import { eventService } from '../../services/event.service.js';
import { EventCard } from '../../components/features/events/EventCard.jsx';
import { EventFilters } from '../../components/features/events/EventFilters.jsx';
import { PageContainer } from '../../components/layout/PageContainer.jsx';

const INITIAL_FILTERS = {
  search: '',
  category: '',
  location: '',
  dateFrom: '',
  dateTo: '',
};

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const fetchEvents = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = {};
      if (f.search) params.search = f.search;
      if (f.category) params.category = f.category;
      if (f.location) params.location = f.location;
      if (f.dateFrom) params.date_from = f.dateFrom;
      if (f.dateTo) params.date_to = f.dateTo;
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

  const hasFilters = filters.search || filters.category || filters.location || filters.dateFrom || filters.dateTo;

  return (
    <PageContainer>
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-extrabold text-label-primary sm:text-5xl">
          Khám phá sự kiện
        </h1>
        <p className="mx-auto max-w-xl text-lg text-label-secondary">
          Tìm vé cho hàng nghìn sự kiện âm nhạc, thể thao, nghệ thuật và giải trí hàng đầu.
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-separator bg-surface p-5 shadow-1">
        <EventFilters filters={filters} onChange={handleFilterChange} />
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-label-secondary">
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

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-1 animate-pulse">
              <div className="aspect-[16/9] bg-fill-tertiary" />
              <div className="space-y-3 px-5 py-4">
                <div className="h-4 w-3/4 rounded bg-fill-tertiary" />
                <div className="h-3 w-1/2 rounded bg-fill-tertiary" />
                <div className="h-3 w-2/3 rounded bg-fill-tertiary" />
                <div className="mt-2 h-3 w-1/3 rounded bg-fill-tertiary" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-24 text-center">
          <Ticket className="mx-auto mb-4 h-14 w-14 text-label-tertiary" aria-hidden="true" />
          <p className="mb-2 text-lg text-label-secondary">Không tìm thấy sự kiện nào.</p>
          {hasFilters && (
            <button
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="mt-3 text-sm text-accent transition hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
