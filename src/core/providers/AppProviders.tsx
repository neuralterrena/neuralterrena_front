import type { PropsWithChildren } from "react";
import { AuthProvider } from "@/features/auth";
import { LanguageProvider, ThemeProvider, TypographyProvider } from "@/shared/providers";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <TypographyProvider>
          <AuthProvider>{children}</AuthProvider>
        </TypographyProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
