import { useLanguage } from "../providers/useLanguage";
import type { Language } from "../../i18n/translations";

const languageOptions: Language[] = ["es", "en"];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div aria-label={t("app.language")} className="segmented-switcher" role="group">
      {languageOptions.map((option) => {
        const label = option === "es" ? t("app.languageSpanish") : t("app.languageEnglish");

        return (
          <button
            aria-label={label}
            aria-pressed={language === option}
            className="segmented-switcher__button"
            data-active={language === option}
            key={option}
            onClick={() => setLanguage(option)}
            type="button"
          >
            <span aria-hidden="true">{option.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
