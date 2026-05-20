import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CalendarDays, Newspaper } from 'lucide-react';
import api from '../lib/api.js';

function formatNewsDate(item, locale) {
  const value = item?.published_at || item?.created_at;
  if (!value) return null;

  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function NewsDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchArticle() {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/news/${id}`, { signal: controller.signal });
        if (!controller.signal.aborted) setArticle(data);
      } catch {
        if (!controller.signal.aborted) {
          setArticle(null);
          setError(t('newsDetail.notFound'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchArticle();

    return () => controller.abort();
  }, [id, t]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-sans">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-label-secondary)] transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('newsDetail.backToNews')}
      </Link>

      {loading ? (
        <article className="overflow-hidden rounded-2xl border border-[var(--border-separator)] bg-[var(--bg-surface)] shadow-sm">
          <div className="h-72 animate-pulse bg-[var(--fill-tertiary)]" />
          <div className="space-y-4 p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--fill-tertiary)]" />
            <div className="h-9 w-4/5 animate-pulse rounded bg-[var(--fill-tertiary)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--fill-tertiary)]" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-[var(--fill-tertiary)]" />
          </div>
        </article>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-separator)] bg-[var(--bg-surface)] px-6 py-16 text-center">
          <Newspaper className="mx-auto mb-4 h-10 w-10 text-[var(--text-label-tertiary)]" />
          <h1 className="text-xl font-bold text-[var(--text-label-primary)]">{t('newsDetail.emptyTitle')}</h1>
          <p className="mt-2 text-sm text-[var(--text-label-secondary)]">{error}</p>
        </div>
      ) : (
        <article className="overflow-hidden rounded-2xl border border-[var(--border-separator)] bg-[var(--bg-surface)] shadow-sm">
          {article.image_url ? (
            <img src={article.image_url} alt={article.title} className="h-72 w-full object-cover sm:h-96" />
          ) : (
            <div className="flex h-72 items-center justify-center bg-[var(--fill-tertiary)] text-[var(--text-label-tertiary)] sm:h-96">
              <Newspaper className="h-16 w-16" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--text-label-secondary)]">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{t('home.latestNews')}</span>
              {formatNewsDate(article, locale) && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatNewsDate(article, locale)}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold leading-tight text-[var(--text-label-primary)] sm:text-4xl">
              {article.title}
            </h1>

            {article.summary && (
              <p className="mt-4 text-lg font-medium leading-8 text-[var(--text-label-secondary)]">
                {article.summary}
              </p>
            )}

            <div className="mt-8 whitespace-pre-line text-base leading-8 text-[var(--text-label-primary)]">
              {article.content}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
