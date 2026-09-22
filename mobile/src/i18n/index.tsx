import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '@/lib/storage';
import { strings } from './strings';

export type Lang = 'en' | 'hi';
export type Localized = { en: string; hi?: string | null };

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof strings)['en'];
  /** Pick the right language from server content, falling back to English. */
  pick: (value: Localized | null | undefined) => string;
};

const LANG_KEY = 'feedants.lang';
const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    storage.get(LANG_KEY).then((saved) => {
      if (saved === 'en' || saved === 'hi') setLangState(saved);
    });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storage.set(LANG_KEY, next);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: strings[lang] as (typeof strings)['en'],
      pick: (v) => (v ? (lang === 'hi' && v.hi) || v.en : ''),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
