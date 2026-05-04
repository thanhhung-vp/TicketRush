import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'vi', label: 'VN', flag: '🇻🇳', full: 'Tiếng Việt (VN)' },
  { code: 'en', label: 'EN', flag: '🇬🇧', full: 'English (EN)' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGS.find(l => l.code === (i18n.language?.slice(0, 2))) || LANGS[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition shadow-sm"
      >
        <span>{current.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface py-1.5 shadow-xl shadow-gray-900/10 dark:shadow-black/30 overflow-hidden">
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-card transition"
            >
              <span className="flex-1">{lang.full}</span>
              {current.code === lang.code && (
                <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
