import { Clock3, FileCheck2, Layers3, LogOut, Map, ShieldCheck, TriangleAlert } from "lucide-react";
import { LanguageSwitcher } from "../../../app/components/LanguageSwitcher";
import { ThemeSwitcher } from "../../../app/components/ThemeSwitcher";
import { useLanguage } from "../../../app/providers/useLanguage";
import { useAuth } from "../../../app/providers/useAuth";

const formatDate = (value: string, language: string) =>
  new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function ConsoleHome() {
  const { logout, session } = useAuth();
  const { language, t } = useLanguage();

  if (!session) {
    return null;
  }

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

  return (
    <main className="console-shell">
      <aside className="console-sidebar" aria-label={t("console.navigation")}>
        <img alt="neural terrena" className="console-sidebar__logo" src="/brand/NT-logo-color-horizontal.png" />
        <div className="toolbar-switchers toolbar-switchers--stacked">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <nav className="console-nav">
          <a aria-current="page" href="#overview">
            <Layers3 aria-hidden="true" size={18} strokeWidth={1.75} />
            {t("console.operation")}
          </a>
          <a href="#terrain">
            <Map aria-hidden="true" size={18} strokeWidth={1.75} />
            {t("console.terrain")}
          </a>
          <a href="#outputs">
            <FileCheck2 aria-hidden="true" size={18} strokeWidth={1.75} />
            {t("console.outputs")}
          </a>
        </nav>
      </aside>

      <section className="console-main" id="overview">
        <header className="console-topbar">
          <div>
            <p className="nt-eyebrow">{t("console.activeSession")}</p>
            <h1>{t("console.panelTitle")}</h1>
          </div>
          <button className="secondary-button" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} strokeWidth={1.75} />
            {t("console.signOut")}
          </button>
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
              <dd>{session.tokens.tokenType}</dd>
            </div>
            <div>
              <dt>{t("console.expires")}</dt>
              <dd>{formatDate(session.tokens.expiresAt, language)}</dd>
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
