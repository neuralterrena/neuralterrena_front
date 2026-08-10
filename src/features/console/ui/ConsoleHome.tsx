import {
  Check,
  ChevronLeft,
  Clock3,
  FileCheck2,
  Globe2,
  Layers3,
  LaptopMinimal,
  LogOut,
  Map,
  MoonStar,
  PanelLeftClose,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth, useLogout } from "@/features/auth";
import { formatDateTime } from "@/shared/lib/datetime/formatDateTime";
import { useLanguage, useTheme } from "@/shared/providers";

export function ConsoleHome() {
  const { session } = useAuth();
  const logout = useLogout();
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, setThemePreference, themePreference } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [openUtilityMenu, setOpenUtilityMenu] = useState<"language" | "theme" | "user" | null>(null);
  const utilityPanelId = useId();
  const themePanelId = `${utilityPanelId}-theme`;
  const languagePanelId = `${utilityPanelId}-language`;
  const userPanelId = `${utilityPanelId}-user`;
  const sidebarRef = useRef<HTMLElement | null>(null);
  const utilityCloseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setOpenUtilityMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(
    () => () => {
      if (utilityCloseTimeoutRef.current !== null) {
        window.clearTimeout(utilityCloseTimeoutRef.current);
      }
    },
    [],
  );

  const cards = [
    {
      icon: Map,
      label: t("console.activeLayers"),
      value: "04",
    },
    {
      icon: Clock3,
      label: t("console.timeWindow"),
      value: "12 h",
    },
    {
      icon: TriangleAlert,
      label: t("console.criticalAlerts"),
      value: "00",
    },
    {
      icon: FileCheck2,
      label: t("console.traceableOutputs"),
      value: "08",
    },
  ];

  const isSidebarExpanded = !isSidebarCollapsed || isSidebarHovered;
  const activeLanguageLabel = language === "es" ? t("app.languageSpanish") : t("app.languageEnglish");
  const activeThemeLabel = t(
    themePreference === "light" ? "app.themeLight" : themePreference === "dark" ? "app.themeDark" : "app.themeSystem",
  );

  const handleToggleUtilityMenu = (menu: "language" | "theme" | "user") => {
    setOpenUtilityMenu((currentMenu) => (currentMenu === menu ? null : menu));
  };

  const handleUtilityEnter = (menu: "language" | "theme" | "user") => {
    if (utilityCloseTimeoutRef.current !== null) {
      window.clearTimeout(utilityCloseTimeoutRef.current);
      utilityCloseTimeoutRef.current = null;
    }

    setOpenUtilityMenu(menu);
  };

  const handleUtilityLeave = () => {
    utilityCloseTimeoutRef.current = window.setTimeout(() => {
      setOpenUtilityMenu(null);
      utilityCloseTimeoutRef.current = null;
    }, 120);
  };

  if (!session) {
    return null;
  }

  const userInitials = session.user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const userRoleSummary = session.user.roles.join(", ") || t("console.userFallbackRole");

  return (
    <main className="console-shell">
      <aside
        aria-label={t("console.navigation")}
        className="console-sidebar"
        data-expanded={isSidebarExpanded}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        ref={sidebarRef}
      >
        <div className="console-sidebar__header">
          <img
            alt="neural terrena"
            className="console-sidebar__logo"
            src={resolvedTheme === "dark" ? "/brand/NT-logo-white-horizontal.png" : "/brand/NT-logo-color-horizontal.png"}
          />
          <img
            alt="neural terrena"
            className="console-sidebar__isotype"
            src={resolvedTheme === "dark" ? "/brand/NT-iso-color-on-white.png" : "/brand/NT-iso-color.png"}
          />
          <button
            aria-label={isSidebarCollapsed ? t("console.navigationExpand") : t("console.navigationCollapse")}
            className="console-sidebar__collapse-button"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            type="button"
          >
            {isSidebarExpanded ? (
              <PanelLeftClose aria-hidden="true" size={18} strokeWidth={1.75} />
            ) : (
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <nav className="console-nav">
          <a aria-current="page" href="#overview">
            <Layers3 aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">{t("console.operation")}</span>
          </a>
          <a href="#terrain">
            <Map aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">{t("console.terrain")}</span>
          </a>
          <a href="#outputs">
            <FileCheck2 aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">{t("console.outputs")}</span>
          </a>
        </nav>

        <div className="console-sidebar__footer">
          <div
            className="console-utility-group"
            data-open={openUtilityMenu === "theme"}
            onMouseEnter={() => handleUtilityEnter("theme")}
            onMouseLeave={handleUtilityLeave}
          >
            <button
              aria-controls={themePanelId}
              aria-expanded={openUtilityMenu === "theme"}
              aria-label={t("app.theme")}
              className="console-utility-button"
              onClick={() => handleToggleUtilityMenu("theme")}
              type="button"
            >
              <MoonStar aria-hidden="true" size={18} strokeWidth={1.75} />
              <span className="console-utility-button__label">{t("app.theme")}</span>
              <small className="console-utility-button__meta">{activeThemeLabel}</small>
            </button>
            {openUtilityMenu === "theme" ? (
              <div
                className="console-utility-panel console-utility-panel--picker console-utility-panel--theme"
                id={themePanelId}
                role="group"
                aria-label={t("app.theme")}
              >
                <button
                  aria-pressed={themePreference === "light"}
                  className="console-utility-option console-utility-option--rich"
                  data-active={themePreference === "light"}
                  onClick={() => setThemePreference("light")}
                  type="button"
                >
                  <span className="console-utility-option__icon-shell">
                    <SunMedium
                      aria-hidden="true"
                      className="console-utility-option__icon console-utility-option__icon--sun"
                      size={16}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("app.themeLight")}</strong>
                  </span>
                  {themePreference === "light" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
                <button
                  aria-pressed={themePreference === "dark"}
                  className="console-utility-option console-utility-option--rich"
                  data-active={themePreference === "dark"}
                  onClick={() => setThemePreference("dark")}
                  type="button"
                >
                  <span className="console-utility-option__icon-shell">
                    <MoonStar
                      aria-hidden="true"
                      className="console-utility-option__icon console-utility-option__icon--moon"
                      size={16}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("app.themeDark")}</strong>
                  </span>
                  {themePreference === "dark" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
                <button
                  aria-pressed={themePreference === "system"}
                  className="console-utility-option console-utility-option--rich"
                  data-active={themePreference === "system"}
                  onClick={() => setThemePreference("system")}
                  type="button"
                >
                  <span className="console-utility-option__icon-shell">
                    <LaptopMinimal
                      aria-hidden="true"
                      className="console-utility-option__icon console-utility-option__icon--laptop"
                      size={16}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("app.themeSystem")}</strong>
                  </span>
                  {themePreference === "system" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
              </div>
            ) : null}
          </div>

          <div
            className="console-utility-group"
            data-open={openUtilityMenu === "language"}
            onMouseEnter={() => handleUtilityEnter("language")}
            onMouseLeave={handleUtilityLeave}
          >
            <button
              aria-controls={languagePanelId}
              aria-expanded={openUtilityMenu === "language"}
              aria-label={t("app.language")}
              className="console-utility-button"
              onClick={() => handleToggleUtilityMenu("language")}
              type="button"
            >
              <Globe2 aria-hidden="true" size={18} strokeWidth={1.75} />
              <span className="console-utility-button__label">{t("app.language")}</span>
              <small className="console-utility-button__meta">{activeLanguageLabel}</small>
            </button>
            {openUtilityMenu === "language" ? (
              <div
                className="console-utility-panel console-utility-panel--picker console-utility-panel--language"
                id={languagePanelId}
                role="group"
                aria-label={t("app.language")}
              >
                <button
                  aria-pressed={language === "es"}
                  className="console-utility-option console-utility-option--rich"
                  data-active={language === "es"}
                  onClick={() => setLanguage("es")}
                  type="button"
                >
                  <span className="console-utility-badge">ES</span>
                  <span className="console-utility-option__stack">
                    <strong>{t("app.languageSpanish")}</strong>
                  </span>
                  {language === "es" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
                <button
                  aria-pressed={language === "en"}
                  className="console-utility-option console-utility-option--rich"
                  data-active={language === "en"}
                  onClick={() => setLanguage("en")}
                  type="button"
                >
                  <span className="console-utility-badge">EN</span>
                  <span className="console-utility-option__stack">
                    <strong>{t("app.languageEnglish")}</strong>
                  </span>
                  {language === "en" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
              </div>
            ) : null}
          </div>

          <div
            className="console-utility-group"
            data-open={openUtilityMenu === "user"}
            onMouseEnter={() => handleUtilityEnter("user")}
            onMouseLeave={handleUtilityLeave}
          >
            <button
              aria-controls={userPanelId}
              aria-expanded={openUtilityMenu === "user"}
              aria-label={t("console.userMenu")}
              className="console-utility-button console-utility-button--user"
              onClick={() => handleToggleUtilityMenu("user")}
              type="button"
            >
              <span aria-hidden="true" className="console-user-avatar">
                {userInitials || "NT"}
              </span>
              <span className="console-utility-button__label">{session.user.displayName}</span>
              <small className="console-utility-button__meta">{userRoleSummary}</small>
            </button>
            {openUtilityMenu === "user" ? (
              <div
                aria-label={t("console.userMenu")}
                className="console-utility-panel console-utility-panel--picker console-utility-panel--user"
                id={userPanelId}
              >
                <div className="console-user-card">
                  <div className="console-user-card__identity">
                    <span aria-hidden="true" className="console-user-avatar">
                      {userInitials || "NT"}
                    </span>
                    <div>
                      <strong>{session.user.displayName}</strong>
                      <p>{session.user.email || session.user.id}</p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>{t("console.userRoleLabel")}</dt>
                      <dd>{userRoleSummary}</dd>
                    </div>
                    <div>
                      <dt>{t("console.expires")}</dt>
                      <dd>{formatDateTime(session.expiresAt, language)}</dd>
                    </div>
                  </dl>
                </div>
                <button className="console-utility-option console-utility-option--rich" type="button">
                  <span className="console-utility-option__icon-shell">
                    <UserRound aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("console.userProfile")}</strong>
                  </span>
                </button>
                <button className="console-utility-option console-utility-option--rich" type="button">
                  <span className="console-utility-option__icon-shell">
                    <Sparkles aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("console.preferences")}</strong>
                  </span>
                </button>
                <button className="console-utility-option console-utility-option--rich" type="button">
                  <span className="console-utility-option__icon-shell">
                    <ShieldCheck
                      aria-hidden="true"
                      className="console-utility-option__icon"
                      size={16}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("console.security")}</strong>
                  </span>
                </button>
                <button
                  className="console-utility-option console-utility-option--rich console-utility-option--danger"
                  onClick={() => void logout()}
                  type="button"
                >
                  <span className="console-utility-option__icon-shell">
                    <LogOut aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>{t("console.signOut")}</strong>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="console-main" id="overview">
        <header className="console-topbar">
          <div>
            <p className="nt-eyebrow">{t("console.activeSession")}</p>
            <h1>{t("console.panelTitle")}</h1>
          </div>
        </header>

        <section className="session-panel" aria-label={t("console.overview")}>
          <div>
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.75} />
            <div>
              <h2>{session.user.displayName}</h2>
              <p>{session.user.roles.join(", ") || t("console.userFallbackRole")}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>{t("console.jwt")}</dt>
              <dd>Bearer</dd>
            </div>
            <div>
              <dt>{t("console.expires")}</dt>
              <dd>{formatDateTime(session.expiresAt, language)}</dd>
            </div>
          </dl>
        </section>

        <section className="metric-grid" aria-label={t("console.operationalState")}>
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <article className="metric-card" key={card.label}>
                <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
