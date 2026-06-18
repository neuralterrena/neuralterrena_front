import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { ThemeContext, type ResolvedTheme, type ThemeContextValue, type ThemePreference } from "./themeContext";

const THEME_STORAGE_KEY = "nt.theme";

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "system" || value === "light" || value === "dark";

const getSystemTheme = (): ResolvedTheme =>
  globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const resolveInitialThemePreference = (): ThemePreference => {
  const storedThemePreference = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null;

  if (isThemePreference(storedThemePreference)) {
    return storedThemePreference;
  }

  return "system";
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(resolveInitialThemePreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia?.("(prefers-color-scheme: dark)");

    if (!mediaQuery) {
      return undefined;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, themePreference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, themePreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      themePreference,
      setThemePreference,
    }),
    [resolvedTheme, themePreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
