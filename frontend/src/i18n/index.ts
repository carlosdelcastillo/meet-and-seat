import { createContext, useContext } from 'react';
import es from './locales/es.json';
import en from './locales/en.json';
import ca from './locales/ca.json';

export type Locale = 'es' | 'en' | 'ca';

const translations: Record<Locale, Record<string, unknown>> = { es, en, ca };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function translate(locale: Locale, key: string): string {
  return getNestedValue(translations[locale] as Record<string, unknown>, key);
}

export function detectLocale(): Locale {
  const lang = navigator.language.slice(0, 2);
  if (lang === 'es' || lang === 'en' || lang === 'ca') {
    return lang;
  }
  return 'en';
}

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'es',
  setLocale: () => {},
  t: (key: string) => key,
});

export function useTranslation(): I18nContextType {
  return useContext(I18nContext);
}
