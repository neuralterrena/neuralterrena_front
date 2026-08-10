import { Clock3, FileCheck2, Map, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { OpenGlobusViewport } from "./OpenGlobusViewport";
import { useTerrainConsole } from "../model/useTerrainConsole";

export function TerrainConsolePage() {
  const [isTimePanelOpen, setIsTimePanelOpen] = useState(false);
  const terrain = useTerrainConsole();
  const cards = [
    {
      icon: Map,
      label: "Capas activas",
      value: String(terrain.metrics.activeLayers).padStart(2, "0"),
    },
    {
      icon: Clock3,
      label: "Ventana temporal",
      value: terrain.metrics.timeWindow,
    },
    {
      icon: TriangleAlert,
      label: "Alertas críticas",
      value: String(terrain.metrics.criticalAlerts).padStart(2, "0"),
    },
    {
      icon: FileCheck2,
      label: "Salidas trazables",
      value: String(terrain.metrics.traceableOutputs).padStart(2, "0"),
    },
  ];

  return (
    <main className="terrain-console-shell">
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
              <button
                className="terrain-segmented__button"
                data-active={terrain.basemap === "topo"}
                onClick={() => terrain.setBasemap("topo")}
                type="button"
              >
                Topográfico
              </button>
              <button
                className="terrain-segmented__button"
                data-active={terrain.basemap === "gray"}
                onClick={() => terrain.setBasemap("gray")}
                type="button"
              >
                Gris claro
              </button>
            </div>
          </div>

          <div className="terrain-console-tools">
            <button
              className="terrain-tool-button"
              data-active={terrain.activeTool === "nav"}
              onClick={() => terrain.setActiveTool("nav")}
              type="button"
            >
              ✋<span>Navegar</span>
            </button>
            <button
              className="terrain-tool-button"
              data-active={terrain.activeTool === "viewshed"}
              onClick={() => terrain.setActiveTool("viewshed")}
              type="button"
            >
              👁
              <span>Viewshed</span>
            </button>
            <button
              className="terrain-tool-button"
              data-active={terrain.activeTool === "los"}
              onClick={() => terrain.setActiveTool("los")}
              type="button"
            >
              ⟿<span>LOS</span>
            </button>
            <button
              className="terrain-tool-button"
              data-active={terrain.mcooVisible}
              onClick={() => void terrain.toggleMcoo()}
              type="button"
            >
              ▦<span>MCOO</span>
            </button>
            <button
              className="terrain-tool-button"
              data-active={terrain.activeTool === "info"}
              onClick={() => terrain.setActiveTool("info")}
              type="button"
            >
              ℹ<span>Intel</span>
            </button>
            <button
              className="terrain-tool-button"
              onClick={terrain.clearOperationalState}
              type="button"
            >
              ✕<span>Limpiar</span>
            </button>
            <button
              className="terrain-tool-button"
              data-active={isTimePanelOpen}
              onClick={() => setIsTimePanelOpen((current) => !current)}
              type="button"
            >
              <Clock3 aria-hidden="true" size={16} strokeWidth={1.9} />
              <span>Tiempo</span>
            </button>
          </div>

          {isTimePanelOpen ? (
            <div className="terrain-time-panel-popup">
              <div className="terrain-time-panel">
                <div className="terrain-time-panel__actions">
                  <button
                    className="terrain-primary-button"
                    onClick={() => terrain.setIsPlaying(!terrain.isPlaying)}
                    type="button"
                  >
                    {terrain.isPlaying ? "Pausar" : "Simular"}
                  </button>
                  <div className="terrain-speed-buttons">
                    {[1, 4, 10].map((speed) => (
                      <button
                        data-active={terrain.speedMultiplier === speed}
                        key={speed}
                        onClick={() =>
                          terrain.setSpeedMultiplier(speed as 1 | 4 | 10)
                        }
                        type="button"
                      >
                        {speed}×
                      </button>
                    ))}
                  </div>
                </div>
                <div className="terrain-time-panel__clock">
                  <strong>{terrain.minutesToClock(terrain.timeMinutes)}</strong>
                  <span>UTC+2</span>
                </div>
                <input
                  max="1440"
                  min="0"
                  onChange={(event) =>
                    terrain.setTimeMinutes(Number(event.target.value))
                  }
                  step="1"
                  type="range"
                  value={terrain.timeMinutes}
                />
                <div className="terrain-time-panel__ticks">
                  {["00", "03", "06", "09", "12", "15", "18", "21", "24"].map(
                    (label) => (
                      <span key={label}>{label}</span>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {terrain.toolStatusMessage ? (
            <div className="terrain-tool-status">
              {terrain.toolStatusMessage}
            </div>
          ) : null}

          <div className="terrain-console-right">
            <div
              className="metric-grid terrain-metric-grid"
              aria-label="Estado operacional"
            >
              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    className="metric-card terrain-metric-card"
                    key={card.label}
                  >
                    <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
                    <p>{card.label}</p>
                    <strong>{card.value}</strong>
                  </article>
                );
              })}
            </div>

            <section className="terrain-panel-card">
              <div className="terrain-tab-strip">
                <button
                  data-active={terrain.activeTab === "sun"}
                  onClick={() => terrain.setActiveTab("sun")}
                  type="button"
                >
                  Sol
                </button>
                <button
                  data-active={terrain.activeTab === "moon"}
                  onClick={() => terrain.setActiveTab("moon")}
                  type="button"
                >
                  Luna
                </button>
                <button
                  data-active={terrain.activeTab === "weather"}
                  onClick={() => terrain.setActiveTab("weather")}
                  type="button"
                >
                  Meteo
                </button>
                <button
                  data-active={terrain.activeTab === "ops"}
                  onClick={() => terrain.setActiveTab("ops")}
                  type="button"
                >
                  OPS
                </button>
              </div>

              {terrain.activeTab === "sun" ? (
                <div className="terrain-data-grid">
                  <h2>Iluminación solar</h2>
                  <div
                    className="terrain-status-badge"
                    data-phase={terrain.solarState.phase}
                  >
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
                    <div>
                      <dt>Altitud</dt>
                      <dd>{terrain.solarState.altitude.toFixed(1)}°</dd>
                    </div>
                    <div>
                      <dt>Azimut</dt>
                      <dd>{terrain.solarState.azimuth.toFixed(1)}°</dd>
                    </div>
                    <div>
                      <dt>Dirección</dt>
                      <dd>{terrain.solarState.direction}</dd>
                    </div>
                    <div>
                      <dt>Amanecer</dt>
                      <dd>
                        {terrain.formatMetricDate(
                          terrain.solarState.times.sunrise,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Atardecer</dt>
                      <dd>
                        {terrain.formatMetricDate(
                          terrain.solarState.times.sunset,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Horas de luz</dt>
                      <dd>{terrain.solarState.daylightLabel}</dd>
                    </div>
                    <div>
                      <dt>Crep. civil AM</dt>
                      <dd>
                        {terrain.formatMetricDate(
                          terrain.solarState.times.civilDawn,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Crep. civil PM</dt>
                      <dd>
                        {terrain.formatMetricDate(
                          terrain.solarState.times.civilDusk,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Crep. náutico AM</dt>
                      <dd>
                        {terrain.formatMetricDate(
                          terrain.solarState.times.nauticalDawn,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Crep. náutico PM</dt>
                      <dd>
                        {terrain.formatMetricDate(
                          terrain.solarState.times.nauticalDusk,
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {terrain.activeTab === "moon" ? (
                <div className="terrain-data-grid">
                  <h2>Posición lunar</h2>
                  <dl>
                    <div>
                      <dt>Iluminación</dt>
                      <dd>
                        {Math.round(
                          terrain.moonState.illuminationFraction * 100,
                        )}
                        %
                      </dd>
                    </div>
                    <div>
                      <dt>Fase</dt>
                      <dd>{terrain.moonState.phaseName}</dd>
                    </div>
                    <div>
                      <dt>Altitud</dt>
                      <dd>{terrain.moonState.altitude.toFixed(1)}°</dd>
                    </div>
                    <div>
                      <dt>Azimut</dt>
                      <dd>{terrain.moonState.azimuth.toFixed(1)}°</dd>
                    </div>
                    <div>
                      <dt>Distancia</dt>
                      <dd>
                        {Math.round(
                          terrain.moonState.distanceKm,
                        ).toLocaleString()}{" "}
                        km
                      </dd>
                    </div>
                    <div>
                      <dt>Salida</dt>
                      <dd>
                        {terrain.moonState.moonrise
                          ? terrain.formatMetricDate(terrain.moonState.moonrise)
                          : "--:--"}
                      </dd>
                    </div>
                    <div>
                      <dt>Puesta</dt>
                      <dd>
                        {terrain.moonState.moonset
                          ? terrain.formatMetricDate(terrain.moonState.moonset)
                          : "--:--"}
                      </dd>
                    </div>
                  </dl>
                  <p className="terrain-note">{terrain.moonState.nvgSummary}</p>
                </div>
              ) : null}

              {terrain.activeTab === "weather" ? (
                <div className="terrain-data-grid">
                  <h2>Condiciones meteorológicas</h2>
                  <dl>
                    <div>
                      <dt>Temperatura</dt>
                      <dd>{terrain.weatherState.temperatureC} °C</dd>
                    </div>
                    <div>
                      <dt>Humedad</dt>
                      <dd>{terrain.weatherState.humidity}%</dd>
                    </div>
                    <div>
                      <dt>Presión</dt>
                      <dd>{terrain.weatherState.pressureHpa} hPa</dd>
                    </div>
                    <div>
                      <dt>Viento</dt>
                      <dd>{terrain.weatherState.windKph} km/h</dd>
                    </div>
                    <div>
                      <dt>Rachas</dt>
                      <dd>{terrain.weatherState.gustKph} km/h</dd>
                    </div>
                    <div>
                      <dt>Dirección</dt>
                      <dd>
                        {terrain.weatherState.windDirection} (
                        {Math.round(terrain.weatherState.windDegrees)}°)
                      </dd>
                    </div>
                    <div>
                      <dt>Cielo</dt>
                      <dd>{terrain.weatherState.sky}</dd>
                    </div>
                    <div>
                      <dt>Visibilidad</dt>
                      <dd>{terrain.weatherState.visibilityKm} km</dd>
                    </div>
                    <div>
                      <dt>Precipitación</dt>
                      <dd>{terrain.weatherState.precipitation}</dd>
                    </div>
                    <div>
                      <dt>Punto de rocío</dt>
                      <dd>{terrain.weatherState.dewPointC} °C</dd>
                    </div>
                    <div>
                      <dt>Riesgo niebla</dt>
                      <dd>{terrain.weatherState.fogLabel}</dd>
                    </div>
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
                          {operation.status === "fav"
                            ? "Favorable"
                            : operation.status === "mar"
                              ? "Marginal"
                              : "Desfavorable"}
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
                  <div>
                    <dt>Coordenadas</dt>
                    <dd>
                      {terrain.pointAnalysis.point.lat.toFixed(5)}°,{" "}
                      {terrain.pointAnalysis.point.lng.toFixed(5)}°
                    </dd>
                  </div>
                  <div>
                    <dt>Elevación</dt>
                    <dd>{Math.round(terrain.pointAnalysis.elevation)} m</dd>
                  </div>
                  <div>
                    <dt>Pendiente</dt>
                    <dd>{terrain.pointAnalysis.slopePercent.toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt>Orientación</dt>
                    <dd>
                      {terrain.pointAnalysis.aspectLabel} (
                      {Math.round(terrain.pointAnalysis.aspectDegrees)}°)
                    </dd>
                  </div>
                  <div>
                    <dt>Movilidad</dt>
                    <dd>{terrain.pointAnalysis.mobilityLabel}</dd>
                  </div>
                  <div>
                    <dt>Cobertura</dt>
                    <dd>{terrain.pointAnalysis.coverLabel}</dd>
                  </div>
                  <div>
                    <dt>Terreno dominante</dt>
                    <dd>
                      {terrain.pointAnalysis.isDominantTerrain ? "Sí" : "No"}
                    </dd>
                  </div>
                  <div>
                    <dt>Fondo de valle</dt>
                    <dd>{terrain.pointAnalysis.isValleyFloor ? "Sí" : "No"}</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            {terrain.viewshedState ? (
              <section className="terrain-panel-card">
                <h2>Viewshed</h2>
                <dl className="terrain-analysis-grid">
                  <div>
                    <dt>Posición</dt>
                    <dd>
                      {terrain.viewshedState.point.lat.toFixed(4)}°,{" "}
                      {terrain.viewshedState.point.lng.toFixed(4)}°
                    </dd>
                  </div>
                  <div>
                    <dt>% visible</dt>
                    <dd>{terrain.viewshedState.percentVisible}%</dd>
                  </div>
                  <div>
                    <dt>Cómputo</dt>
                    <dd>
                      {terrain.viewshedState.durationSeconds.toFixed(2)} s
                    </dd>
                  </div>
                  <div>
                    <dt>Radio</dt>
                    <dd>{terrain.viewshedState.radiusKm.toFixed(1)} km</dd>
                  </div>
                </dl>
              </section>
            ) : null}

            {terrain.losState ? (
              <section className="terrain-panel-card">
                <h2>Línea de vista</h2>
                <dl className="terrain-analysis-grid">
                  <div>
                    <dt>Distancia</dt>
                    <dd>{terrain.losState.distanceKm.toFixed(2)} km</dd>
                  </div>
                  <div>
                    <dt>Desnivel</dt>
                    <dd>{terrain.losState.elevationDelta} m</dd>
                  </div>
                  <div>
                    <dt>Resultado</dt>
                    <dd>
                      {terrain.losState.blocked ? "Obstruida" : "Despejada"}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}

            <section className="terrain-panel-card">
              <h2>Motor y configuración</h2>
              <div className="terrain-engine-row">
                <span
                  className="terrain-engine-dot"
                  data-status={terrain.engineState.status}
                />
                <span>{terrain.engineState.message}</span>
              </div>
              <div className="terrain-progress">
                <div style={{ width: `${terrain.engineState.progress}%` }} />
              </div>
              <dl className="terrain-analysis-grid">
                <div>
                  <dt>Tiles DEM</dt>
                  <dd>{terrain.engineState.loadedTileCount}</dd>
                </div>
                <div>
                  <dt>Centro</dt>
                  <dd>
                    {terrain.viewState.center.lat.toFixed(3)}°,{" "}
                    {terrain.viewState.center.lng.toFixed(3)}°
                  </dd>
                </div>
              </dl>
              <label className="terrain-slider-field">
                <span>Exageración 3D</span>
                <input
                  max="3"
                  min="0"
                  onChange={(event) =>
                    terrain.setTerrainExaggeration(Number(event.target.value))
                  }
                  step="0.1"
                  type="range"
                  value={terrain.terrainExaggeration}
                />
                <strong>{terrain.terrainExaggeration.toFixed(1)}</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Opacidad MCOO</span>
                <input
                  max="1"
                  min="0.1"
                  onChange={(event) =>
                    terrain.setMcooOpacity(Number(event.target.value))
                  }
                  step="0.05"
                  type="range"
                  value={terrain.mcooOpacity}
                />
                <strong>{Math.round(terrain.mcooOpacity * 100)}%</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Radio viewshed</span>
                <input
                  max="15"
                  min="1"
                  onChange={(event) =>
                    terrain.setViewshedRadiusKm(Number(event.target.value))
                  }
                  step="0.5"
                  type="range"
                  value={terrain.viewshedRadiusKm}
                />
                <strong>{terrain.viewshedRadiusKm.toFixed(1)} km</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Alt. observador</span>
                <input
                  max="30"
                  min="0"
                  onChange={(event) =>
                    terrain.setObserverHeight(Number(event.target.value))
                  }
                  step="1"
                  type="range"
                  value={terrain.observerHeight}
                />
                <strong>{terrain.observerHeight} m</strong>
              </label>
              <label className="terrain-slider-field">
                <span>Opacidad viewshed</span>
                <input
                  max="1"
                  min="0.1"
                  onChange={(event) =>
                    terrain.setViewshedOpacity(Number(event.target.value))
                  }
                  step="0.05"
                  type="range"
                  value={terrain.viewshedOpacity}
                />
                <strong>{Math.round(terrain.viewshedOpacity * 100)}%</strong>
              </label>
              <label className="terrain-toggle-line">
                <input
                  checked={terrain.viewshedLiveMode}
                  onChange={(event) =>
                    terrain.setViewshedLiveMode(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>Viewshed con cursor vivo</span>
              </label>
              <label className="terrain-date-field">
                <span>Fecha</span>
                <input
                  onChange={(event) =>
                    terrain.setSelectedDate(
                      new Date(`${event.target.value}T12:00:00`),
                    )
                  }
                  type="date"
                  value={terrain.selectedDate.toISOString().slice(0, 10)}
                />
              </label>
            </section>
          </div>

          <div className="terrain-console-footer">
            <div className="terrain-coordinates">
              <span>
                {Math.abs(terrain.cursorPoint.lat).toFixed(4)}°
                {terrain.cursorPoint.lat >= 0 ? "N" : "S"}
              </span>
              <span>
                {Math.abs(terrain.cursorPoint.lng).toFixed(4)}°
                {terrain.cursorPoint.lng >= 0 ? "E" : "W"}
              </span>
              <span>Z {terrain.viewState.pseudoZoom.toFixed(1)}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
