import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { formatVND, formatDate } from '../../../utils/format.js';
import { CATEGORIES, CATEGORY_BADGE_COLORS } from '../../../utils/constants.js';

function getSeatsBadge(event) {
  const available = event.available_seats ?? event.seats_available ?? null;
  const total = event.total_seats ?? null;

  if (available === null) return null;

  if (available === 0) {
    return <span className="rounded-full border border-danger bg-danger-tint px-2 py-0.5 text-xs text-danger">Hết vé</span>;
  }

  const ratio = total ? available / total : 1;
  if (ratio < 0.2) {
    return <span className="rounded-full border border-warning bg-warning-tint px-2 py-0.5 text-xs text-warning">Sắp hết - {available} ghế</span>;
  }
  return <span className="rounded-full border border-success bg-success-tint px-2 py-0.5 text-xs text-success">{available} ghế trống</span>;
}

function getCategoryLabel(value) {
  const cat = CATEGORIES.find(c => c.value === value);
  return cat ? cat.label : value;
}

export function EventCard({ event }) {
  const badgeColor = CATEGORY_BADGE_COLORS[event.category] ?? CATEGORY_BADGE_COLORS.other;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-separator bg-surface shadow-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-info hover:shadow-2"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-fill-tertiary">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-label-tertiary">
            <Ticket className="h-12 w-12" aria-hidden="true" />
          </div>
        )}

        {event.category && (
          <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeColor}`}>
            {getCategoryLabel(event.category)}
          </span>
        )}
      </div>

      <div className="space-y-3 px-5 py-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-label-primary transition-colors group-hover:text-info">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-label-secondary">
          {event.venue && (
            <p className="flex items-center gap-1.5 line-clamp-1">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{event.venue}</span>
            </p>
          )}
          {event.event_date && (
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formatDate(event.event_date)}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {getSeatsBadge(event)}
          <span className="ml-auto text-sm font-bold text-info">
            {event.min_price != null ? `từ ${formatVND(event.min_price, true)}` : 'Xem chi tiết'}
          </span>
        </div>
      </div>
    </Link>
  );
}
