'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  type Language,
  type Translations,
  translations,
  toolDescriptionsId,
} from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: Translations;
  getToolDesc: (id: string, fallbackEn: string) => string;
  getCategoryLabel: (cat: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('id');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('changespdf_lang');
      if (saved === 'id' || saved === 'en') {
        setLangState(saved);
        document.documentElement.lang = saved;
        return;
      }

      // Detect location / browser language
      const navLangs = navigator.languages || [navigator.language || ''];
      const isIndonesianLocale = navLangs.some((l) =>
        l.toLowerCase().startsWith('id')
      );

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const isIndonesianTz =
        timeZone.includes('Jakarta') ||
        timeZone.includes('Makassar') ||
        timeZone.includes('Jayapura') ||
        timeZone.includes('Pontianak');

      // If user is from Indonesia, default to 'id'. Otherwise, default to 'en'.
      if (isIndonesianLocale || isIndonesianTz) {
        setLangState('id');
        document.documentElement.lang = 'id';
      } else {
        setLangState('en');
        document.documentElement.lang = 'en';
      }
    } catch (e) {
      // Fallback
      setLangState('id');
    }
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('changespdf_lang', newLang);
      document.documentElement.lang = newLang;
    } catch (e) {}
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'id' ? 'en' : 'id');
  }, [lang, setLang]);

  const t = useMemo(() => translations[lang], [lang]);

  const getToolDesc = useCallback(
    (id: string, fallbackEn: string) => {
      if (lang === 'id') {
        return toolDescriptionsId[id] || fallbackEn;
      }
      return fallbackEn;
    },
    [lang]
  );

  const getCategoryLabel = useCallback(
    (cat: string) => {
      const catKey = cat as keyof Translations['categories'];
      return t.categories[catKey] || cat;
    },
    [t]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      getToolDesc,
      getCategoryLabel,
    }),
    [lang, setLang, toggleLang, t, getToolDesc, getCategoryLabel]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
