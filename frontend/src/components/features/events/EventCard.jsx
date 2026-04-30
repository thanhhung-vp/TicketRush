import { Link } from 'react-router-dom';
import { formatVND, formatDate } from '../../../utils/format.js';
import { CATEGORIES, CATEGORY_BADGE_COLORS } from '../../../utils/constants.js';

function getSeatsBadge(event) {
  const available = event.available_seats ?? event.seats_available ?? null;
  const total     = event.total_seats ?? null;

  if (available === null) return null;

  if (available === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800">Hết vé</span>;
  }

  const ratio = total ? available / total : 1;
  if (ratio < 0.2) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 border border-yellow-800">Sắp hết — {available} ghế</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800">{available} ghế trống</span>;
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
      className="group block bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-all duration-200 hover:shadow-xl hover:shadow-black/40"
    >
      {/* Poster */}
      <div className="relative aspect-[16/9] bg-gray-800 overflow-hidden">
        {event.poster_url ? (
          <img
            src={event.poster_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl select-none">
            {CATEGORIES.find(c => c.value === event.category)?.label?.split(' ')[0] ?? '🎫'}
          </div>
        )}

        {/* Category badge overlay */}
        {event.category && (
          <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full border ${badgeColor}`}>
            {getCategoryLabel(event.category)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-gray-400">
          {event.venue && (
            <p className="flex items-center gap-1.5 line-clamp-1">
              <span>📍</span>
              <span>{event.venue}</span>
            </p>
          )}
          {event.event_date && (
            <p className="flex items-center gap-1.5">
              <span>📅</span>
              <span>{formatDate(event.event_date)}</span>
            </p>
          )}
        </div>

        {/* Footer: seats + price */}
        <div className="flex items-center justify-between pt-1">
          {getSeatsBadge(event)}
          <span className="text-blue-400 font-bold text-sm ml-auto">
            {event.min_price != null
              ? `từ ${formatVND(event.min_price, true)}`
              : 'Xem chi tiết'}
          </span>
        </div>
      </div>
    </Link>
  );
}
