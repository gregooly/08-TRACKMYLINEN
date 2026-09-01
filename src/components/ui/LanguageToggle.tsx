'use client';

import { useTranslation, type Locale } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  const buttonClass = (lang: Locale) =>
    `px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
      locale === lang
        ? 'bg-green-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="flex items-center gap-1 border border-gray-200 rounded-md p-0.5">
      <button
        type="button"
        className={buttonClass('en')}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
      >
        {t('language.en')}
      </button>
      <button
        type="button"
        className={buttonClass('fr')}
        onClick={() => setLocale('fr')}
        aria-pressed={locale === 'fr'}
      >
        {t('language.fr')}
      </button>
    </div>
  );
}
