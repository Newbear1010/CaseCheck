import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, defaultLocale, type Locale } from '../locales';
import type { TranslationKeys } from '../locales/zh-TW';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
  // Helper function to translate with parameter substitution
  translate: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLocale = defaultLocale
}) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Try to get locale from localStorage
    const saved = localStorage.getItem('locale') as Locale;
    return saved && (saved === 'zh-TW' || saved === 'en-US') ? saved : initialLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  // Helper function for nested key access and parameter substitution
  const translate = useCallback((key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters like {name} with values
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value;
  }, [locale]);

  const value: I18nContextType = {
    locale,
    setLocale,
    t: translations[locale],
    translate,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
