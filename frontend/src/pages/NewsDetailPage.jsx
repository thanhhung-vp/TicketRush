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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-primary dark:text-gray-400 dark:hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('newsDetail.backToNews')}
      </Link>

      {loading ? (
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
          <div className="h-72 animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-4 p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-9 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </article>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-dark-border dark:bg-dark-surface">
          <Newspaper className="mx-auto mb-4 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('newsDetail.emptyTitle')}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      ) : (
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
          {article.image_url ? (
            <img src={article.image_url} alt={article.title} className="h-72 w-full object-cover sm:h-96" />
          ) : (
            <div className="flex h-72 items-center justify-center bg-gradient-to-br from-slate-100 via-white to-cyan-50 text-gray-400 dark:from-dark-card dark:via-dark-surface dark:to-cyan-950/30 sm:h-96">
              <Newspaper className="h-16 w-16" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{t('home.latestNews')}</span>
              {formatNewsDate(article, locale) && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatNewsDate(article, locale)}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold leading-tight text-gray-950 dark:text-white sm:text-4xl">
              {article.title}
            </h1>

            {article.summary && (
              <p className="mt-4 text-lg font-medium leading-8 text-gray-600 dark:text-gray-300">
                {article.summary}
              </p>
            )}

            <div className="mt-8 whitespace-pre-line text-base leading-8 text-gray-700 dark:text-gray-200">
              {article.content}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
