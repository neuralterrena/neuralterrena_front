import { Clock3, FileCheck2, Layers3, LogOut, Map, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "../../../app/providers/useAuth";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function ConsoleHome() {
  const { logout, session } = useAuth();

  if (!session) {
    return null;
  }

  const cards = [
    {
      icon: Map,
      label: "Capas activas",
      value: "04",
    },
    {
      icon: Clock3,
      label: "Ventana temporal",
      value: "12 h",
    },
    {
      icon: TriangleAlert,
      label: "Alertas críticas",
      value: "00",
    },
    {
      icon: FileCheck2,
      label: "Salidas trazables",
      value: "08",
    },
  ];

  return (
    <main className="console-shell">
      <aside className="console-sidebar" aria-label="Navegación principal">
        <img alt="neural terrena" className="console-sidebar__logo" src="/brand/NT-logo-color-horizontal.png" />
        <nav className="console-nav">
          <a aria-current="page" href="#overview">
            <Layers3 aria-hidden="true" size={18} strokeWidth={1.75} />
            Operación
          </a>
          <a href="#terrain">
            <Map aria-hidden="true" size={18} strokeWidth={1.75} />
            Terreno
          </a>
          <a href="#outputs">
            <FileCheck2 aria-hidden="true" size={18} strokeWidth={1.75} />
            Salidas
          </a>
        </nav>
      </aside>

      <section className="console-main" id="overview">
        <header className="console-topbar">
          <div>
            <p className="nt-eyebrow">Sesión activa</p>
            <h1>Panel operativo</h1>
          </div>
          <button className="secondary-button" onClick={logout} type="button">
            <LogOut aria-hidden="true" size={18} strokeWidth={1.75} />
            Salir
          </button>
        </header>

        <section className="session-panel" aria-label="Resumen de sesión">
          <div>
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.75} />
            <div>
              <h2>{session.user.displayName}</h2>
              <p>{session.user.roles.join(", ") || "usuario"}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>JWT</dt>
              <dd>{session.tokens.tokenType}</dd>
            </div>
            <div>
              <dt>Expira</dt>
              <dd>{formatDate(session.tokens.expiresAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="metric-grid" aria-label="Estado operacional">
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
