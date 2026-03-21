"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import enUS from "./locales/en_US.json";
import zhCN from "./locales/zh_CN.json";

type Locale = "en_US" | "zh_CN";
type Translations = typeof enUS;

const translations: Record<Locale, Translations> = {
  en_US: enUS,
  zh_CN: zhCN,
};

interface I18nContextType {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 从 localStorage 或浏览器语言设置初始化
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("locale") as Locale;
      if (saved && translations[saved]) {
        return saved;
      }
      const browserLang = navigator.language;
      if (browserLang.startsWith("zh")) {
        return "zh_CN";
      }
    }
    return "en_US";
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", newLocale);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = translations[locale];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key; // 找不到翻译时返回 key
        }
      }

      if (typeof value !== "string") {
        return key;
      }

      // 替换参数
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey]?.toString() ?? match;
        });
      }

      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
