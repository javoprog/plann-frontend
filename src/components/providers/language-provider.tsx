"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { translations, type TranslationKey } from "@/lib/i18n/translations";
import type { Language, User } from "@/lib/types";

type TranslationValues = Record<string, string | number>;

interface LanguageContextValue {
  language: Language;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  changeLanguage: (language: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [languageOverride, setLanguageOverride] = useState<Language | null>(
    null,
  );
  const language = languageOverride ?? user?.language ?? "en";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, values: TranslationValues = {}) =>
      Object.entries(values).reduce(
        (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
        translations[language][key],
      ),
    [language],
  );

  const changeLanguage = useCallback(
    async (nextLanguage: Language) => {
      if (!user || nextLanguage === language) return;
      const previousLanguage = language;
      setLanguageOverride(nextLanguage);
      updateUser({ ...user, language: nextLanguage });
      try {
        const { data } = await api.patch<User>("/users/language", {
          language: nextLanguage,
        });
        updateUser(data);
        setLanguageOverride(null);
      } catch (error) {
        setLanguageOverride(null);
        updateUser({ ...user, language: previousLanguage });
        throw error;
      }
    },
    [language, updateUser, user],
  );

  const value = useMemo(
    () => ({ language, t, changeLanguage }),
    [changeLanguage, language, t],
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
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
