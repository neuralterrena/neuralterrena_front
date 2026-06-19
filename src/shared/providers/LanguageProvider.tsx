import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { defaultLanguage, translations, type Language, type TranslationKey } from "@/shared/i18n";
import { LanguageContext, type LanguageContextValue } from "./languageContext";

const LANGUAGE_STORAGE_KEY = "nt.language";

const isLanguage = (value: string | null): value is Language => value === "es" || value === "en";

const resolveInitialLanguage = (): Language => {
  const storedLanguage = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) ?? null;

  if (isLanguage(storedLanguage)) {
    return storedLanguage;
  }

  return defaultLanguage;
};

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

  useEffect(() => {
    globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey) => translations[language][key],
    }),
    [language],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}
