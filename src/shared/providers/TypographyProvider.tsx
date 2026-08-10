import { useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { TypographyContext, type TypographyContextValue } from "./typographyContext";

const TYPOGRAPHY_STORAGE_KEY = "nt.typography.large";
const FONT_SIZES = {
  "--nt-text-xs": 12,
  "--nt-text-sm": 14,
  "--nt-text-base": 16,
  "--nt-text-lg": 18,
  "--nt-text-xl": 20,
  "--nt-text-2xl": 24,
  "--nt-text-3xl": 32,
  "--nt-text-4xl": 40,
} as const;
const LARGE_FONT_SCALE = 1.15;

const resolveInitialFontScale = () => globalThis.localStorage?.getItem(TYPOGRAPHY_STORAGE_KEY) === "true";

export function TypographyProvider({ children }: PropsWithChildren) {
  const [fontScaleLarge, setFontScaleLarge] = useState(resolveInitialFontScale);

  useEffect(() => {
    const scale = fontScaleLarge ? LARGE_FONT_SCALE : 1;
    const rootStyle = document.documentElement.style;

    Object.entries(FONT_SIZES).forEach(([token, size]) => {
      rootStyle.setProperty(token, `${size * scale}px`);
    });
    globalThis.localStorage?.setItem(TYPOGRAPHY_STORAGE_KEY, String(fontScaleLarge));

    return () => {
      Object.keys(FONT_SIZES).forEach((token) => {
        rootStyle.removeProperty(token);
      });
    };
  }, [fontScaleLarge]);

  const value = useMemo<TypographyContextValue>(
    () => ({ fontScaleLarge, setFontScaleLarge }),
    [fontScaleLarge],
  );

  return <TypographyContext value={value}>{children}</TypographyContext>;
}
