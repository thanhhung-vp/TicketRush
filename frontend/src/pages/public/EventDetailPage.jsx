import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../../services/event.service.js';
import SeatMap from '../../components/features/seats/SeatMap.jsx';
import { formatVND, formatDate } from '../../utils/format.js';
import { CATEGORIES, CATEGORY_BADGE_COLORS } from '../../utils/constants.js';
import { useAuth } from '../../store/auth.context.jsx';
import { PageSpinner, Badge, Alert } from '../../components/ui/index.js';
import { PageContainer } from '../../components/layout/PageContainer.jsx';

function getCategoryLabel(value) {
  return CATEGORIES.find(c => c.value === value)?.label ?? value;
}

export default function EventDetailPage() {
  const { id }           = useParams();
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const [event, setEvent]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    eventService.getById(id)
      .then(setEvent)
      .catch(() => setError('Không tìm thấy sự kiện.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;

  if (error || !event) {
    return (
      <PageContainer maxWidth="max-w-2xl">
        <Alert type="error">{error || 'Không tìm thấy sự kiện.'}</Alert>
      </PageContainer>
    );
  }

  const badgeColor = CATEGORY_BADGE_COLORS[event.category] ?? CATEGORY_BADGE_COLORS.other;

  return (
    <PageContainer>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column — sticky info panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 sticky top-20">
            {/* Poster */}
            <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center overflow-hidden">
              {event.poster_url ? (
                <img
                  src={event.poster_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-8xl select-none">
                  {CATEGORIES.find(c => c.value === event.category)?.label?.split(' ')[0] ?? '🎫'}
                </span>
              )}
              {event.category && (
                <span
                  className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full border ${badgeColor}`}
                >
                  {getCategoryLabel(event.category)}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold leading-snug">{event.title}</h1>

              {event.description && (
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-4">
                  {event.description}
                </p>
              )}

              <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 flex-shrink-0">Địa điểm</span>
                  <span className="text-right ml-auto font-medium">{event.venue}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 flex-shrink-0">Thời gian</span>
                  <span className="text-right ml-auto font-medium">
                    {formatDate(event.event_date, { full: true })}
                  </span>
                </div>
              </div>

              {/* Zone price list */}
              {event.zones && event.zones.length > 0 && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                    Giá vé theo khu
                  </p>
                  <div className="space-y-2">
                    {event.zones.map(z => (
                      <div key={z.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: z.color }}
                          />
                          <span>{z.name}</span>
                        </span>
                        <span className="font-semibold text-blue-400">{formatVND(z.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column — seat map */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Chọn ghế ngồi</h2>

          {!user && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 mb-5">
              <p className="text-sm text-yellow-300">
                Vui lòng{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="underline font-semibold hover:text-yellow-200 transition"
                >
                  đăng nhập
                </button>{' '}
                để chọn và đặt vé.
              </p>
            </div>
          )}

          <SeatMap eventId={id} />
        </div>
      </div>
    </PageContainer>
  );
}
