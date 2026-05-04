import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const VALUE_ICONS = [
  (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
];

const VALUE_KEYS = ['trust', 'speed', 'fair', 'user'];
const STAT_KEYS = [
  { value: '500+', key: 'events' },
  { value: '2M+',  key: 'tickets' },
  { value: '63',   key: 'provinces' },
  { value: '99%',  key: 'satisfaction' },
];

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">

      {/* Hero */}
      <div className="text-center mb-16">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{t('about.heroLabel')}</p>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          {t('about.heroTitle1')}<br />
          <span className="text-primary">{t('about.heroTitle2')}</span>
        </h1>
        <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">
          {t('about.heroDesc')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {STAT_KEYS.map(s => (
          <div key={s.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-3xl font-extrabold text-primary mb-1">{s.value}</p>
            <p className="text-sm text-gray-500">{t(`about.stats.${s.key}`)}</p>
          </div>
        ))}
      </div>

      {/* Story */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-10 mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('about.storyTitle')}</h2>
        <div className="prose prose-sm max-w-none text-gray-600 space-y-3 leading-relaxed">
          <p>{t('about.storyP1')}</p>
          <p>{t('about.storyP2')}</p>
          <p dangerouslySetInnerHTML={{ __html: t('about.storyP3') }} />
        </div>
      </div>

      {/* Values */}
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('about.valuesTitle')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">
        {VALUE_KEYS.map((key, i) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {VALUE_ICONS[i]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{t(`about.values.${key}.title`)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(`about.values.${key}.desc`)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contact CTA */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('about.ctaTitle')}</h2>
        <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
          {t('about.ctaDesc')}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="mailto:partner@ticketrush.vn"
            className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition">
            partner@ticketrush.vn
          </a>
          <Link to="/faq"
            className="px-6 py-2.5 rounded-full border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
            {t('about.ctaFaq')}
          </Link>
        </div>
      </div>
    </div>
  );
}
