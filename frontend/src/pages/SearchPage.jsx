import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin, Search } from 'lucide-react';
import api from '../lib/api.js';

function formatDate(value, locale) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(value) {
  if (!value) return null;
  return new Intl.NumberFormat('vi-VN').format(Number(value));
}

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('search') || searchParams.get('q') || '').trim();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchResults() {
      if (!query) {
        setEvents([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get('/events', {
          params: { search: query, sort: 'date' },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!controller.signal.aborted) setEvents([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchResults();
    return () => controller.abort();
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('common.search')}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-gray-950 dark:text-white sm:text-3xl">
              {query ? t('search.resultsFor', { query }) : t('search.resultsTitle')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {query ? t('search.resultsHint') : t('search.noQuery')}
            </p>
          </div>
          {query && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-600 dark:border-dark-border dark:bg-dark-card dark:text-gray-300">
              {loading ? t('search.searching') : t('search.resultsCount', { count: events.length })}
            </span>
          )}
        </div>
      </section>

      {!query ? (
        <EmptySearch label={t('search.noQuery')} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
              <div className="mb-4 aspect-[16/10] rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="mb-3 h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptySearch label={t('search.noResultsFor', { query })} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {events.map(event => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md dark:border-dark-border dark:bg-dark-surface"
            >
              <div className="aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-dark-card">
                {event.poster_url ? (
                  <img src={event.poster_url} alt={event.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
                    <Search className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 text-sm font-bold leading-6 text-gray-950 transition group-hover:text-primary dark:text-white">
                  {event.title}
                </h2>
                <div className="mt-3 space-y-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    <span className="truncate">{formatDate(event.event_date, locale)}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    <span className="truncate">{event.venue}</span>
                  </p>
                </div>
                {formatPrice(event.min_price) && (
                  <p className="mt-4 text-sm font-bold text-primary">
                    {t('event.priceFrom')} {formatPrice(event.min_price)} VND
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptySearch({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm font-medium text-gray-500 dark:border-dark-border dark:bg-dark-surface dark:text-gray-400">
      <Search className="mx-auto mb-3 h-9 w-9 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      {label}
    </div>
  );
}
