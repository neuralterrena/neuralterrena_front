import { useLanguage } from "../providers/useLanguage";
import { useTheme } from "../providers/useTheme";
import type { ThemePreference } from "../providers/themeContext";

const themeOptions: ThemePreference[] = ["light", "dark", "system"];

export function ThemeSwitcher() {
  const { resolvedTheme, setThemePreference, themePreference } = useTheme();
  const { t } = useLanguage();

  return (
    <div aria-label={t("app.theme")} className="segmented-switcher" role="group">
      {themeOptions.map((option) => {
        const label = t(
          option === "light" ? "app.themeLight" : option === "dark" ? "app.themeDark" : "app.themeSystem",
        );

        return (
          <button
            aria-label={label}
            aria-pressed={themePreference === option}
            className="segmented-switcher__button"
            data-active={themePreference === option}
            data-theme={resolvedTheme}
            key={option}
            onClick={() => setThemePreference(option)}
            type="button"
          >
            <span aria-hidden="true">
              {option === "light" ? "Light" : option === "dark" ? "Dark" : "System"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
