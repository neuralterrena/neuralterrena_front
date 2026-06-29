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
import { OpenGlobusViewport } from "./OpenGlobusViewport";
import { useTerrainConsole } from "../model/useTerrainConsole";

export function TerrainConsolePage() {
  const { session } = useAuth();
  const logout = useLogout();
  const { language, setLanguage } = useLanguage();
  const { setThemePreference, themePreference } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isTimePanelOpen, setIsTimePanelOpen] = useState(false);
  const [openUtilityMenu, setOpenUtilityMenu] = useState<"language" | "theme" | "user" | null>(null);
  const utilityPanelId = useId();
  const themePanelId = `${utilityPanelId}-theme`;
  const languagePanelId = `${utilityPanelId}-language`;
  const userPanelId = `${utilityPanelId}-user`;
  const sidebarRef = useRef<HTMLElement | null>(null);
  const utilityCloseTimeoutRef = useRef<number | null>(null);
  const terrain = useTerrainConsole();

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

  if (!session) {
    return null;
  }

  const isSidebarExpanded = !isSidebarCollapsed || isSidebarHovered;
  const userInitials = session.user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const userRoleSummary = session.user.roles.join(", ") || "usuario";
  const activeThemeLabel = themePreference === "light" ? "Claro" : themePreference === "dark" ? "Oscuro" : "Sistema";
  const activeLanguageLabel = language === "es" ? "Español" : "English";
  const cards = [
    { icon: Map, label: "Capas activas", value: String(terrain.metrics.activeLayers).padStart(2, "0") },
    { icon: Clock3, label: "Ventana temporal", value: terrain.metrics.timeWindow },
    { icon: TriangleAlert, label: "Alertas críticas", value: String(terrain.metrics.criticalAlerts).padStart(2, "0") },
    { icon: FileCheck2, label: "Salidas trazables", value: String(terrain.metrics.traceableOutputs).padStart(2, "0") },
  ];

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

  return (
    <main className="terrain-console-shell">
      <aside
        aria-label="Navegación principal"
        className="console-sidebar terrain-console-sidebar"
        data-expanded={isSidebarExpanded}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        ref={sidebarRef}
      >
        <div className="console-sidebar__header">
          <img alt="neural terrena" className="console-sidebar__logo" src="/brand/NT-logo-color-horizontal.png" />
          <img alt="neural terrena" className="console-sidebar__isotype" src="/brand/NT-iso-color-on-white.png" />
          <button
            aria-label={isSidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
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
          <button aria-pressed={terrain.activeTab === "sun"} onClick={() => terrain.setActiveTab("sun")} type="button">
            <SunMedium aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">Sol</span>
          </button>
          <button aria-pressed={terrain.activeTab === "moon"} onClick={() => terrain.setActiveTab("moon")} type="button">
            <MoonStar aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">Luna</span>
          </button>
          <button aria-pressed={terrain.activeTab === "weather"} onClick={() => terrain.setActiveTab("weather")} type="button">
            <Globe2 aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">Meteo</span>
          </button>
          <button aria-pressed={terrain.activeTab === "ops"} onClick={() => terrain.setActiveTab("ops")} type="button">
            <Layers3 aria-hidden="true" size={18} strokeWidth={1.75} />
            <span className="console-nav__label">OPS</span>
          </button>
        </nav>

        <div className="console-sidebar__footer">
          <div className="console-utility-group">
            <button
              aria-pressed={terrain.fontScaleLarge}
              aria-label="Aumentar tipografía"
              className="console-utility-button"
              onClick={() => terrain.setFontScaleLarge(!terrain.fontScaleLarge)}
              type="button"
            >
              <span className="console-utility-button__label">Texto</span>
              <small className="console-utility-button__meta">{terrain.fontScaleLarge ? "Aa+" : "Aa"}</small>
            </button>
          </div>

          <div
            className="console-utility-group"
            data-open={openUtilityMenu === "theme"}
            onMouseEnter={() => handleUtilityEnter("theme")}
            onMouseLeave={handleUtilityLeave}
          >
            <button
              aria-controls={themePanelId}
              aria-expanded={openUtilityMenu === "theme"}
              aria-label="Tema"
              className="console-utility-button"
              onClick={() => handleToggleUtilityMenu("theme")}
              type="button"
            >
              <MoonStar aria-hidden="true" size={18} strokeWidth={1.75} />
              <span className="console-utility-button__label">Tema</span>
              <small className="console-utility-button__meta">{activeThemeLabel}</small>
            </button>
            {openUtilityMenu === "theme" ? (
              <div className="console-utility-panel console-utility-panel--picker console-utility-panel--theme" id={themePanelId} role="group" aria-label="Tema">
                <button aria-pressed={themePreference === "light"} className="console-utility-option console-utility-option--rich" data-active={themePreference === "light"} onClick={() => setThemePreference("light")} type="button">
                  <span className="console-utility-option__icon-shell">
                    <SunMedium aria-hidden="true" className="console-utility-option__icon console-utility-option__icon--sun" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Claro</strong>
                  </span>
                  {themePreference === "light" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
                <button aria-pressed={themePreference === "dark"} className="console-utility-option console-utility-option--rich" data-active={themePreference === "dark"} onClick={() => setThemePreference("dark")} type="button">
                  <span className="console-utility-option__icon-shell">
                    <MoonStar aria-hidden="true" className="console-utility-option__icon console-utility-option__icon--moon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Oscuro</strong>
                  </span>
                  {themePreference === "dark" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
                <button aria-pressed={themePreference === "system"} className="console-utility-option console-utility-option--rich" data-active={themePreference === "system"} onClick={() => setThemePreference("system")} type="button">
                  <span className="console-utility-option__icon-shell">
                    <LaptopMinimal aria-hidden="true" className="console-utility-option__icon console-utility-option__icon--laptop" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Sistema</strong>
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
              aria-label="Idioma"
              className="console-utility-button"
              onClick={() => handleToggleUtilityMenu("language")}
              type="button"
            >
              <Globe2 aria-hidden="true" size={18} strokeWidth={1.75} />
              <span className="console-utility-button__label">Idioma</span>
              <small className="console-utility-button__meta">{activeLanguageLabel}</small>
            </button>
            {openUtilityMenu === "language" ? (
              <div className="console-utility-panel console-utility-panel--picker console-utility-panel--language" id={languagePanelId} role="group" aria-label="Idioma">
                <button aria-pressed={language === "es"} className="console-utility-option console-utility-option--rich" data-active={language === "es"} onClick={() => setLanguage("es")} type="button">
                  <span className="console-utility-badge">ES</span>
                  <span className="console-utility-option__stack">
                    <strong>Español</strong>
                  </span>
                  {language === "es" ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
                </button>
                <button aria-pressed={language === "en"} className="console-utility-option console-utility-option--rich" data-active={language === "en"} onClick={() => setLanguage("en")} type="button">
                  <span className="console-utility-badge">EN</span>
                  <span className="console-utility-option__stack">
                    <strong>English</strong>
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
            <button aria-controls={userPanelId} aria-expanded={openUtilityMenu === "user"} aria-label="Menú de usuario" className="console-utility-button console-utility-button--user" onClick={() => handleToggleUtilityMenu("user")} type="button">
              <span aria-hidden="true" className="console-user-avatar">
                {userInitials || "NT"}
              </span>
              <span className="console-utility-button__label">{session.user.displayName}</span>
              <small className="console-utility-button__meta">{userRoleSummary}</small>
            </button>
            {openUtilityMenu === "user" ? (
              <div aria-label="Menú de usuario" className="console-utility-panel console-utility-panel--picker console-utility-panel--user" id={userPanelId}>
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
                      <dt>Roles activos</dt>
                      <dd>{userRoleSummary}</dd>
                    </div>
                    <div>
                      <dt>Expira</dt>
                      <dd>{formatDateTime(session.expiresAt, language)}</dd>
                    </div>
                  </dl>
                </div>
                <button className="console-utility-option console-utility-option--rich" type="button">
                  <span className="console-utility-option__icon-shell">
                    <UserRound aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Perfil</strong>
                  </span>
                </button>
                <button className="console-utility-option console-utility-option--rich" type="button">
                  <span className="console-utility-option__icon-shell">
                    <Sparkles aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Preferencias</strong>
                  </span>
                </button>
                <button className="console-utility-option console-utility-option--rich" type="button">
                  <span className="console-utility-option__icon-shell">
                    <ShieldCheck aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Seguridad</strong>
                  </span>
                </button>
                <button className="console-utility-option console-utility-option--rich console-utility-option--danger" onClick={() => void logout()} type="button">
                  <span className="console-utility-option__icon-shell">
                    <LogOut aria-hidden="true" className="console-utility-option__icon" size={16} strokeWidth={1.75} />
                  </span>
                  <span className="console-utility-option__stack">
                    <strong>Salir</strong>
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="terrain-console-main">
        <section className="terrain-console-map-area">
          <OpenGlobusViewport
            basemap={terrain.basemap}
            cursorCrosshair={terrain.activeTool !== "nav"}
            infoPoint={terrain.pointAnalysis?.point ?? null}
            losPendingPoint={terrain.losPendingPoint}
            losState={terrain.losState}
            mcooOverlay={terrain.mcooOverlay}
            nightOpacity={terrain.nightOpacity}
            pointAnalysisPoint={terrain.pointAnalysis?.point ?? null}
            terrainExaggeration={terrain.terrainExaggeration}
            viewshedState={terrain.viewshedState}
            onMapClick={(point) => void terrain.onMapClick(point)}
            onMapMove={terrain.onMapMove}
            onViewChange={terrain.setViewState}
          />

          <div className="terrain-console-map-actions">
            <div className="terrain-segmented">
              <button className="terrain-segmented__button" data-active={terrain.basemap === "topo"} onClick={() => terrain.setBasemap("topo")} type="button">
                Topográfico
              </button>
              <button className="terrain-segmented__button" data-active={terrain.basemap === "gray"} onClick={() => terrain.setBasemap("gray")} type="button">
                Gris claro
              </button>
            </div>
          </div>

          <div className="terrain-console-tools">
            <button className="terrain-tool-button" data-active={terrain.activeTool === "nav"} onClick={() => terrain.setActiveTool("nav")} type="button">
              ✋
              <span>Navegar</span>
            </button>
            <button className="terrain-tool-button" data-active={terrain.activeTool === "viewshed"} onClick={() => terrain.setActiveTool("viewshed")} type="button">
              👁
              <span>Viewshed</span>
            </button>
            <button className="terrain-tool-button" data-active={terrain.activeTool === "los"} onClick={() => terrain.setActiveTool("los")} type="button">
              ⟿
              <span>LOS</span>
            </button>
            <button className="terrain-tool-button" data-active={terrain.mcooVisible} onClick={() => void terrain.toggleMcoo()} type="button">
              ▦
              <span>MCOO</span>
            </button>
            <button className="terrain-tool-button" data-active={terrain.activeTool === "info"} onClick={() => terrain.setActiveTool("info")} type="button">
              ℹ
              <span>Intel</span>
            </button>
            <button className="terrain-tool-button" onClick={terrain.clearOperationalState} type="button">
              ✕
              <span>Limpiar</span>
            </button>
            <button className="terrain-tool-button" data-active={isTimePanelOpen} onClick={() => setIsTimePanelOpen((current) => !current)} type="button">
              <Clock3 aria-hidden="true" size={16} strokeWidth={1.9} />
              <span>Tiempo</span>
            </button>
          </div>

          {isTimePanelOpen ? (
            <div className="terrain-time-panel-popup">
              <div className="terrain-time-panel">
                <div className="terrain-time-panel__actions">
                  <button className="terrain-primary-button" onClick={() => terrain.setIsPlaying(!terrain.isPlaying)} type="button">
                    {terrain.isPlaying ? "Pausar" : "Simular"}
                  </button>
                  <div className="terrain-speed-buttons">
                    {[1, 4, 10].map((speed) => (
                      <button data-active={terrain.speedMultiplier === speed} key={speed} onClick={() => terrain.setSpeedMultiplier(speed as 1 | 4 | 10)} type="button">
                        {speed}×
                      </button>
                    ))}
                  </div>
                </div>
                <div className="terrain-time-panel__clock">
                  <strong>{terrain.minutesToClock(terrain.timeMinutes)}</strong>
                  <span>UTC+2</span>
                </div>
                <input max="1440" min="0" onChange={(event) => terrain.setTimeMinutes(Number(event.target.value))} step="1" type="range" value={terrain.timeMinutes} />
                <div className="terrain-time-panel__ticks">
                  {["00", "03", "06", "09", "12", "15", "18", "21", "24"].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {terrain.toolStatusMessage ? <div className="terrain-tool-status">{terrain.toolStatusMessage}</div> : null}

          <div className="terrain-console-right">
            <div className="metric-grid terrain-metric-grid" aria-label="Estado operacional">
              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <article className="metric-card terrain-metric-card" key={card.label}>
                    <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
                    <p>{card.label}</p>
                    <strong>{card.value}</strong>
                  </article>
                );
              })}
            </div>

            <section className="terrain-panel-card">
              <div className="terrain-tab-strip">
                <button data-active={terrain.activeTab === "sun"} onClick={() => terrain.setActiveTab("sun")} type="button">
                  Sol
                </button>
                <button data-active={terrain.activeTab === "moon"} onClick={() => terrain.setActiveTab("moon")} type="button">
                  Luna
                </button>
                <button data-active={terrain.activeTab === "weather"} onClick={() => terrain.setActiveTab("weather")} type="button">
                  Meteo
                </button>
                <button data-active={terrain.activeTab === "ops"} onClick={() => terrain.setActiveTab("ops")} type="button">
                  OPS
                </button>
              </div>

              {terrain.activeTab === "sun" ? (
                <div className="terrain-data-grid">
                  <h2>Iluminación solar</h2>
                  <div className="terrain-status-badge" data-phase={terrain.solarState.phase}>
                    {terrain.solarState.phase === "day"
                      ? "Día"
                      : terrain.solarState.phase === "civil"
                        ? "Crepúsculo civil"
                        : terrain.solarState.phase === "nautical"
                          ? "Crepúsculo náutico"
                          : terrain.solarState.phase === "astronomical"
                            ? "Crepúsculo astronómico"
                            : "Noche"}
                  </div>
                  <dl>
                    <div><dt>Altitud</dt><dd>{terrain.solarState.altitude.toFixed(1)}°</dd></div>
                    <div><dt>Azimut</dt><dd>{terrain.solarState.azimuth.toFixed(1)}°</dd></div>
                    <div><dt>Dirección</dt><dd>{terrain.solarState.direction}</dd></div>
                    <div><dt>Amanecer</dt><dd>{terrain.formatMetricDate(terrain.solarState.times.sunrise)}</dd></div>
                    <div><dt>Atardecer</dt><dd>{terrain.formatMetricDate(terrain.solarState.times.sunset)}</dd></div>
                    <div><dt>Horas de luz</dt><dd>{terrain.solarState.daylightLabel}</dd></div>
                    <div><dt>Crep. civil AM</dt><dd>{terrain.formatMetricDate(terrain.solarState.times.civilDawn)}</dd></div>
                    <div><dt>Crep. civil PM</dt><dd>{terrain.formatMetricDate(terrain.solarState.times.civilDusk)}</dd></div>
                    <div><dt>Crep. náutico AM</dt><dd>{terrain.formatMetricDate(terrain.solarState.times.nauticalDawn)}</dd></div>
                    <div><dt>Crep. náutico PM</dt><dd>{terrain.formatMetricDate(terrain.solarState.times.nauticalDusk)}</dd></div>
                  </dl>
                </div>
              ) : null}

              {terrain.activeTab === "moon" ? (
                <div className="terrain-data-grid">
                  <h2>Posición lunar</h2>
                  <dl>
                    <div><dt>Iluminación</dt><dd>{Math.round(terrain.moonState.illuminationFraction * 100)}%</dd></div>
                    <div><dt>Fase</dt><dd>{terrain.moonState.phaseName}</dd></div>
                    <div><dt>Altitud</dt><dd>{terrain.moonState.altitude.toFixed(1)}°</dd></div>
                    <div><dt>Azimut</dt><dd>{terrain.moonState.azimuth.toFixed(1)}°</dd></div>
                    <div><dt>Distancia</dt><dd>{Math.round(terrain.moonState.distanceKm).toLocaleString()} km</dd></div>
                    <div><dt>Salida</dt><dd>{terrain.moonState.moonrise ? terrain.formatMetricDate(terrain.moonState.moonrise) : "--:--"}</dd></div>
                    <div><dt>Puesta</dt><dd>{terrain.moonState.moonset ? terrain.formatMetricDate(terrain.moonState.moonset) : "--:--"}</dd></div>
                  </dl>
                  <p className="terrain-note">{terrain.moonState.nvgSummary}</p>
                </div>
              ) : null}

              {terrain.activeTab === "weather" ? (
                <div className="terrain-data-grid">
                  <h2>Condiciones meteorológicas</h2>
                  <dl>
                    <div><dt>Temperatura</dt><dd>{terrain.weatherState.temperatureC} °C</dd></div>
                    <div><dt>Humedad</dt><dd>{terrain.weatherState.humidity}%</dd></div>
                    <div><dt>Presión</dt><dd>{terrain.weatherState.pressureHpa} hPa</dd></div>
                    <div><dt>Viento</dt><dd>{terrain.weatherState.windKph} km/h</dd></div>
                    <div><dt>Rachas</dt><dd>{terrain.weatherState.gustKph} km/h</dd></div>
                    <div><dt>Dirección</dt><dd>{terrain.weatherState.windDirection} ({Math.round(terrain.weatherState.windDegrees)}°)</dd></div>
                    <div><dt>Cielo</dt><dd>{terrain.weatherState.sky}</dd></div>
                    <div><dt>Visibilidad</dt><dd>{terrain.weatherState.visibilityKm} km</dd></div>
                    <div><dt>Precipitación</dt><dd>{terrain.weatherState.precipitation}</dd></div>
                    <div><dt>Punto de rocío</dt><dd>{terrain.weatherState.dewPointC} °C</dd></div>
                    <div><dt>Riesgo niebla</dt><dd>{terrain.weatherState.fogLabel}</dd></div>
                  </dl>
                </div>
              ) : null}

              {terrain.activeTab === "ops" ? (
                <div className="terrain-data-grid">
                  <h2>Matriz de efectos</h2>
                  <div className="terrain-ops-list">
                    {terrain.operationAssessments.map((operation) => (
                      <div className="terrain-ops-item" key={operation.name}>
                        <span>{operation.name}</span>
                        <strong data-status={operation.status}>
                          {operation.status === "fav" ? "Favorable" : operation.status === "mar" ? "Marginal" : "Desfavorable"}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {terrain.pointAnalysis ? (
              <section className="terrain-panel-card">
                <h2>Intel punto OAKOC</h2>
                <dl className="terrain-analysis-grid">
                  <div><dt>Coordenadas</dt><dd>{terrain.pointAnalysis.point.lat.toFixed(5)}°, {terrain.pointAnalysis.point.lng.toFixed(5)}°</dd></div>
                  <div><dt>Elevación</dt><dd>{Math.round(terrain.pointAnalysis.elevation)} m</dd></div>
                  <div><dt>Pendiente</dt><dd>{terrain.pointAnalysis.slopePercent.toFixed(1)}%</dd></div>
                  <div><dt>Orientación</dt><dd>{terrain.pointAnalysis.aspectLabel} ({Math.round(terrain.pointAnalysis.aspectDegrees)}°)</dd></div>
                  <div><dt>Movilidad</dt><dd>{terrain.pointAnalysis.mobilityLabel}</dd></div>
                  <div><dt>Cobertura</dt><dd>{terrain.pointAnalysis.coverLabel}</dd></div>
                  <div><dt>Terreno dominante</dt><dd>{terrain.pointAnalysis.isDominantTerrain ? "Sí" : "No"}</dd></div>
                  <div><dt>Fondo de valle</dt><dd>{terrain.pointAnalysis.isValleyFloor ? "Sí" : "No"}</dd></div>
                </dl>
              </section>
            ) : null}

            {terrain.viewshedState ? (
              <section className="terrain-panel-card">
                <h2>Viewshed</h2>
                <dl className="terrain-analysis-grid">
                  <div><dt>Posición</dt><dd>{terrain.viewshedState.point.lat.toFixed(4)}°, {terrain.viewshedState.point.lng.toFixed(4)}°</dd></div>
                  <div><dt>% visible</dt><dd>{terrain.viewshedState.percentVisible}%</dd></div>
                  <div><dt>Cómputo</dt><dd>{terrain.viewshedState.durationSeconds.toFixed(2)} s</dd></div>
                  <div><dt>Radio</dt><dd>{terrain.viewshedState.radiusKm.toFixed(1)} km</dd></div>
                </dl>
              </section>
            ) : null}

            {terrain.losState ? (
              <section className="terrain-panel-card">
                <h2>Línea de vista</h2>
                <dl className="terrain-analysis-grid">
                  <div><dt>Distancia</dt><dd>{terrain.losState.distanceKm.toFixed(2)} km</dd></div>
                  <div><dt>Desnivel</dt><dd>{terrain.losState.elevationDelta} m</dd></div>
                  <div><dt>Resultado</dt><dd>{terrain.losState.blocked ? "Obstruida" : "Despejada"}</dd></div>
                </dl>
              </section>
            ) : null}

            <section className="terrain-panel-card">
              <h2>Motor y configuración</h2>
              <div className="terrain-engine-row">
                <span className="terrain-engine-dot" data-status={terrain.engineState.status} />
                <span>{terrain.engineState.message}</span>
              </div>
              <div className="terrain-progress">
                <div style={{ width: `${terrain.engineState.progress}%` }} />
              </div>
              <dl className="terrain-analysis-grid">
                <div><dt>Tiles DEM</dt><dd>{terrain.engineState.loadedTileCount}</dd></div>
                <div><dt>Centro</dt><dd>{terrain.viewState.center.lat.toFixed(3)}°, {terrain.viewState.center.lng.toFixed(3)}°</dd></div>
              </dl>
              <label className="terrain-slider-field">
                <span>Exageración 3D</span>
                <input max="3" min="0" onChange={(event) => terrain.setTerrainExaggeration(Number(event.target.value))} step="0.1" type="range" value={terrain.terrainExaggeration} />
                <strong>{terrain.terrainExaggeration.toFixed(1)}</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Opacidad MCOO</span>
                <input max="1" min="0.1" onChange={(event) => terrain.setMcooOpacity(Number(event.target.value))} step="0.05" type="range" value={terrain.mcooOpacity} />
                <strong>{Math.round(terrain.mcooOpacity * 100)}%</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Radio viewshed</span>
                <input max="15" min="1" onChange={(event) => terrain.setViewshedRadiusKm(Number(event.target.value))} step="0.5" type="range" value={terrain.viewshedRadiusKm} />
                <strong>{terrain.viewshedRadiusKm.toFixed(1)} km</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Alt. observador</span>
                <input max="30" min="0" onChange={(event) => terrain.setObserverHeight(Number(event.target.value))} step="1" type="range" value={terrain.observerHeight} />
                <strong>{terrain.observerHeight} m</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Opacidad viewshed</span>
                <input max="1" min="0.1" onChange={(event) => terrain.setViewshedOpacity(Number(event.target.value))} step="0.05" type="range" value={terrain.viewshedOpacity} />
                <strong>{Math.round(terrain.viewshedOpacity * 100)}%</strong>
              </label>
              <label className="terrain-toggle-line">
                <input checked={terrain.viewshedLiveMode} onChange={(event) => terrain.setViewshedLiveMode(event.target.checked)} type="checkbox" />
                <span>Viewshed con cursor vivo</span>
              </label>
              <label className="terrain-date-field">
                <span>Fecha</span>
                <input onChange={(event) => terrain.setSelectedDate(new Date(`${event.target.value}T12:00:00`))} type="date" value={terrain.selectedDate.toISOString().slice(0, 10)} />
              </label>
            </section>
          </div>

          <div className="terrain-console-footer">
            <div className="terrain-coordinates">
              <span>{Math.abs(terrain.cursorPoint.lat).toFixed(4)}°{terrain.cursorPoint.lat >= 0 ? "N" : "S"}</span>
              <span>{Math.abs(terrain.cursorPoint.lng).toFixed(4)}°{terrain.cursorPoint.lng >= 0 ? "E" : "W"}</span>
              <span>Z {terrain.viewState.pseudoZoom.toFixed(1)}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
