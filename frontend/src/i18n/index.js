import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import vi from './locales/vi.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    // Thứ tự ưu tiên: localStorage → browser → fallback
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    interpolation: {
      escapeValue: false, // React tự escape
    },
  });

export default i18n;
