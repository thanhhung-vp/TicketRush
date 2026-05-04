import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const TYPE_KEYS = ['account', 'technical', 'order', 'payment', 'other'];

export default function FeedbackPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '' });
  const [sent, setSent] = useState(false);

  const handle = (e) => {
    e.preventDefault();
    setSent(true);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (sent) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t('feedback.successTitle')}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{t('feedback.successDesc')}</p>
        <button onClick={() => { setSent(false); setForm({ name: '', email: '', type: '', message: '' }); }}
          className="px-6 py-2.5 rounded-full border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition">
          {t('feedback.sendAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">{t('feedback.label')}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('feedback.title')}</h1>
        <p className="text-sm text-gray-500">{t('feedback.desc')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
        <form onSubmit={handle} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5 font-medium">{t('feedback.nameLabel')}</label>
              <input type="text" required value={form.name} onChange={set('name')}
                placeholder={t('feedback.namePlaceholder')}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition placeholder-gray-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5 font-medium">{t('feedback.emailLabel')}</label>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="you@example.com"
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition placeholder-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">{t('feedback.typeLabel')}</label>
            <div className="relative">
              <select required value={form.type} onChange={set('type')}
                className="w-full appearance-none bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition text-gray-700">
                <option value="">{t('feedback.typePlaceholder')}</option>
                {TYPE_KEYS.map(k => (
                  <option key={k} value={k}>{t(`feedback.types.${k}`)}</option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">{t('feedback.messageLabel')}</label>
            <textarea required rows={5} value={form.message} onChange={set('message')}
              placeholder={t('feedback.messagePlaceholder')}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition placeholder-gray-400 resize-none" />
          </div>

          <button type="submit"
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #ec4899)' }}>
            {t('feedback.submitBtn')}
          </button>
        </form>
      </div>

      {/* Contact info */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {[
          { labelKey: 'feedback.emailSupport', value: 'support@ticketrush.vn' },
          { labelKey: 'feedback.hotline',      value: '1800 6789' },
          { labelKey: 'feedback.workingHours', valueKey: 'feedback.workingHoursValue' },
        ].map(({ labelKey, value, valueKey }) => (
          <div key={labelKey} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 text-center shadow-sm">
            <p className="text-xs text-gray-400 mb-0.5">{t(labelKey)}</p>
            <p className="text-sm font-medium text-gray-800">{valueKey ? t(valueKey) : value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
