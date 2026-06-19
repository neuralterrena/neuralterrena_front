import type { PropsWithChildren } from "react";
import { AuthProvider } from "@/features/auth";
import { LanguageProvider, ThemeProvider } from "@/shared/providers";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
