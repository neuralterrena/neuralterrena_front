import type { Language } from "@/shared/i18n";

export function formatDateTime(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
