'use client';

import { useLocale } from '@/lib/locale-context';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex p-1 rounded-lg bg-secondary/50">
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1.5 text-sm rounded-md transition-all ${
          locale === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('ru')}
        className={`px-3 py-1.5 text-sm rounded-md transition-all ${
          locale === 'ru'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        RU
      </button>
    </div>
  );
}
