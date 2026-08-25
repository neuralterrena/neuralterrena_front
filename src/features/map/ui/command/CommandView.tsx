import { Bell, Eye, Layers3, Gauge, PanelLeftClose, RotateCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Map } from "maplibre-gl";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/shared/providers";
import { buildRasterTileUrl, type ForecastLayer } from "../../api/forecastMapApi";
import { COMMAND_LANES, isBreach } from "../../model/commandLanes";
import { activeAlerts, commandRuleStore, type CommandRule } from "../../model/commandRules";
import { readMapConfiguration } from "../../model/config";
import { formatCoordinate } from "../../model/coordinates";
import { scaleBarStep } from "../../model/geodesy";
import { availableLayers, forecastValidDate, layerById, selectLayer } from "../../model/layers";
import { illuminationBands } from "../../model/solar";
import { useCommandRun, useCommandSeries } from "../../model/useCommandData";
import { useMapView } from "../../model/useMapView";
import { MapLibreViewport } from "../MapLibreViewport";
import { CommandAlerts, CommandBanner } from "./CommandAlerts";
import { CommandRules } from "./CommandRules";
import { CommandTimeline } from "./CommandTimeline";
import { CommandTopStrip, type CommandMode } from "./CommandTopStrip";

const configuration = readMapConfiguration();

type ModuleId = "forecast" | "rules";

/**
 * Command view — the map-centric operations surface.
 *
 * The map is the application: it fills the viewport and every panel floats
 * above it, never shrinking it. Dragging the timeline cursor re-derives the
 * raster on the map and every readout on the chrome, which is the whole point
 * of the surface.
 */
export function CommandView() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState<CommandMode>("mil");
  const [activeModule, setActiveModule] = useState<ModuleId | null>("forecast");
  const [rules, setRules] = useState<CommandRule[]>(() => commandRuleStore.read());
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [showReadouts, setShowReadouts] = useState(true);
  const [isClear, setIsClear] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [layer, setLayer] = useState<ForecastLayer | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  // The clock the whole surface reads "now" from; ticking it in state keeps
  // render pure and keeps the strip, the badge and the cursor in agreement.
  const [now, setNow] = useState(() => Date.now());

  const run = useCommandRun(configuration.forecastHubApiBaseUrl, t("command.loadFailed"));
  const view = useMapView(map);
  const centre = useMemo(
    () => view?.center ?? { lat: configuration.initialView.center[1], lng: configuration.initialView.center[0] },
    [view?.center],
  );
  const seriesState = useCommandSeries(
    configuration.forecastHubApiBaseUrl,
    run.model,
    run.run,
    run.metadata,
    centre,
    t("command.seriesFailed"),
  );

  const hours = useMemo(() => run.metadata?.forecast_hours ?? [], [run.metadata]);
  const cursorHour = hours.includes(hour ?? -1) ? (hour ?? hours[0]) : (hours[0] ?? null);
  const validLayers = availableLayers(run.metadata, cursorHour);
  const currentLayer = layer && validLayers.includes(layer) ? layer : selectLayer(run.metadata, cursorHour);
  const definition = currentLayer ? layerById.get(currentLayer) : undefined;
  const validDate = cursorHour === null ? null : forecastValidDate(run.run, cursorHour);

  // The cycle's own hour zero is the present instant for this run.
  const cycleDate = run.run ? forecastValidDate(run.run, 0) : null;
  const cycleAgeHours = cycleDate ? (now - cycleDate.getTime()) / 3_600_000 : null;
  const nowHour = cycleAgeHours === null ? 0 : Math.max(0, Math.round(cycleAgeHours));
  const offsetHours = (cursorHour ?? 0) - nowHour;
  const timeState = offsetHours === 0 ? "live" : offsetHours > 0 ? "forecast" : "review";

  const bands = useMemo(() => {
    if (!cycleDate || hours.length < 2) return [];
    const from = new Date(cycleDate.getTime() + hours[0] * 3_600_000);
    const to = new Date(cycleDate.getTime() + hours[hours.length - 1] * 3_600_000);
    return illuminationBands(from, to, centre);
  }, [centre, cycleDate, hours]);

  const rasterUrl = useMemo(() => {
    if (!run.model || !run.run || !currentLayer || cursorHour === null || !definition) return null;
    return buildRasterTileUrl(
      configuration.forecastHubApiBaseUrl,
      run.model,
      run.run,
      currentLayer,
      cursorHour,
      definition.defaultRange,
      definition.palette,
    );
  }, [currentLayer, cursorHour, definition, run.model, run.run]);

  const stepHour = useCallback(
    (direction: number) => {
      if (hours.length === 0) return;
      const index = hours.indexOf(cursorHour ?? hours[0]);
      setHour(hours[Math.min(hours.length - 1, Math.max(0, index + direction))]);
    },
    [cursorHour, hours],
  );

  const snapToNow = useCallback(() => {
    if (hours.length === 0) return;
    setHour(hours.reduce((best, value) => (Math.abs(value - nowHour) < Math.abs(best - nowHour) ? value : best)));
  }, [hours, nowHour]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPlaying || hours.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setHour((current) => hours[(Math.max(0, hours.indexOf(current ?? hours[0])) + 1) % hours.length]);
    }, 850);
    return () => window.clearInterval(timer);
  }, [hours, isPlaying]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((value) => !value);
      } else if (event.key === "n" || event.key === "N") {
        snapToNow();
      } else if (event.key === "ArrowLeft") {
        stepHour(-1);
      } else if (event.key === "ArrowRight") {
        stepHour(1);
      } else if (event.key === "\\") {
        setIsClear((value) => !value);
      } else if (event.key === "Escape") {
        setIsClear(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snapToNow, stepHour]);

  // The surface owns the viewport; nothing behind it may scroll.
  useEffect(() => {
    document.body.classList.add("cmd-host");
    return () => document.body.classList.remove("cmd-host");
  }, []);

  const updateRules = useCallback((next: CommandRule[]) => {
    setRules(next);
    commandRuleStore.write(next);
  }, []);

  const place = formatCoordinate(centre, 2);
  const alerts = useMemo(
    () =>
      activeAlerts(
        rules,
        COMMAND_LANES,
        (laneId) => seriesState.series.find((entry) => entry.laneId === laneId)?.samples ?? [],
        nowHour,
      ),
    [nowHour, rules, seriesState.series],
  );
  // Only a window that is already running fills the banner red.
  const banner = alerts.find(
    (alert) => alert.trigger.severity === "critical" && alert.rule.id !== dismissedAlertId,
  );
  const armedCount = alerts.length;

  const timelineHeight = isTimelineCollapsed ? 42 : 42 + (COMMAND_LANES.length + 2) * 30 + 26;
  const scale = view ? scaleBarStep(view.metersPerPixel, 90) : null;

  return (
    <div
      className={isClear ? "cmd is-clear" : "cmd"}
      data-mode={mode}
      style={{ "--tl-h": `${String(timelineHeight)}px` } as React.CSSProperties}
    >
      <div className="cmd__map">
        <MapLibreViewport
          basemapStyleUrl={configuration.basemaps[0].styleUrl}
          compact={false}
          configuration={configuration}
          flat
          onError={() => undefined}
          onMapReady={setMap}
          onStyleReload={() => undefined}
          projection="mercator"
          rasterUrl={rasterUrl}
          rasterUrls={[]}
          windField={null}
          windMode="particles"
        />
      </div>

      <div className="cmd__over">
        <CommandTopStrip
          cycleAgeHours={cycleAgeHours}
          mode={mode}
          onExit={() => void navigate("/")}
          onModeChange={setMode}
          offsetHours={offsetHours}
          timeState={timeState}
        />

        {banner ? (
          <CommandBanner
            alert={banner}
            onDismiss={() => setDismissedAlertId(banner.rule.id)}
            onSelect={setHour}
          />
        ) : null}

        <nav aria-label={t("command.modules")} className="cmd__rail">
          <button
            aria-pressed={activeModule === "forecast"}
            className={activeModule === "forecast" ? "cmd__railbtn is-on" : "cmd__railbtn"}
            onClick={() => setActiveModule((current) => (current === "forecast" ? null : "forecast"))}
            title={t("command.moduleForecast")}
            type="button"
          >
            <Layers3 aria-hidden="true" strokeWidth={1.5} />
          </button>
          <button
            aria-pressed={activeModule === "rules"}
            className={activeModule === "rules" ? "cmd__railbtn is-on" : "cmd__railbtn"}
            onClick={() => setActiveModule((current) => (current === "rules" ? null : "rules"))}
            title={t("command.moduleAlerts")}
            type="button"
          >
            <Bell aria-hidden="true" strokeWidth={1.5} />
            {armedCount > 0 ? <b>{armedCount}</b> : null}
          </button>
          <button
            aria-pressed={showReadouts}
            className={showReadouts ? "cmd__railbtn is-on" : "cmd__railbtn"}
            onClick={() => setShowReadouts((value) => !value)}
            title={t("command.moduleReadouts")}
            type="button"
          >
            <Gauge aria-hidden="true" strokeWidth={1.5} />
          </button>
          <span className="cmd__rail-sp" />
          <span aria-hidden="true" className="cmd__rail-div" />
          <button
            aria-pressed={isClear}
            className={isClear ? "cmd__railbtn is-on" : "cmd__railbtn"}
            onClick={() => setIsClear((value) => !value)}
            title={t("command.clearView")}
            type="button"
          >
            <PanelLeftClose aria-hidden="true" strokeWidth={1.5} />
          </button>
        </nav>

        {activeModule === "forecast" ? (
          <section aria-label={t("command.moduleForecast")} className="cmd-panel cmd-panel--l">
            <header className="cmd-panel__hd">
              <Layers3 aria-hidden="true" strokeWidth={1.5} />
              <span className="cmd-panel__t">{t("command.moduleForecast")}</span>
              <span className="cmd-panel__n">{run.run || "—"}</span>
            </header>
            <div className="cmd-panel__bd">
              <div className="cmd-sec">
                <div className="cmd-sec__h">
                  <span className="cmd-sec__t">{t("map.model")}</span>
                </div>
                {run.models.map((candidate) => (
                  <button
                    aria-checked={candidate.id === run.model}
                    className={candidate.id === run.model ? "cmd-row is-sel" : "cmd-row"}
                    key={candidate.id}
                    onClick={() => run.setModel(candidate.id)}
                    role="radio"
                    type="button"
                  >
                    <span className="cmd-row__m">
                      <span className="cmd-row__t">{candidate.label || candidate.id}</span>
                    </span>
                  </button>
                ))}
                {run.models.length === 0 ? <p className="cmd-empty">{t("command.noModels")}</p> : null}
              </div>

              <div aria-hidden="true" className="cmd-rule-line" />

              <div className="cmd-sec">
                <div className="cmd-sec__h">
                  <span className="cmd-sec__t">{t("map.layer")}</span>
                </div>
                {validLayers.length === 0 ? <p className="cmd-empty">{t("map.layersUnavailable")}</p> : null}
                {validLayers.map((candidate) => {
                  const entry = layerById.get(candidate);
                  return entry ? (
                    <button
                      aria-checked={candidate === currentLayer}
                      className={candidate === currentLayer ? "cmd-row is-sel" : "cmd-row"}
                      key={candidate}
                      onClick={() => setLayer(candidate)}
                      role="radio"
                      type="button"
                    >
                      <span className="cmd-row__m">
                        <span className="cmd-row__t">{t(entry.labelKey)}</span>
                        <span className="cmd-row__s">{entry.unit}</span>
                      </span>
                    </button>
                  ) : null;
                })}
              </div>

              {run.error ? (
                <>
                  <div aria-hidden="true" className="cmd-rule-line" />
                  <p className="cmd-empty">{run.error}</p>
                  <button className="cmd-btn cmd-btn--ghost" onClick={run.reload} type="button">
                    <RotateCw aria-hidden="true" strokeWidth={1.5} />
                    {t("map.retry")}
                  </button>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeModule === "rules" ? (
          <section aria-label={t("command.moduleAlerts")} className="cmd-panel cmd-panel--l">
            <header className="cmd-panel__hd">
              <Bell aria-hidden="true" strokeWidth={1.5} />
              <span className="cmd-panel__t">{t("command.moduleAlerts")}</span>
              <span className="cmd-panel__n">{armedCount}</span>
            </header>
            <div className="cmd-panel__bd">
              <CommandAlerts alerts={alerts} onSelect={setHour} place={place} />
              <div aria-hidden="true" className="cmd-rule-line" />
              <CommandRules
                onAdd={(draft) =>
                  updateRules([...rules, { ...draft, id: `${draft.laneId}-${String(rules.length + 1)}` }])
                }
                onRemove={(id) => updateRules(rules.filter((entry) => entry.id !== id))}
                onToggle={(id) =>
                  updateRules(rules.map((entry) => (entry.id === id ? { ...entry, armed: !entry.armed } : entry)))
                }
                place={place}
                rules={rules}
              />
            </div>
          </section>
        ) : null}

        {showReadouts ? (
          <section aria-label={t("command.moduleReadouts")} className="cmd-panel cmd-panel--r">
            <header className="cmd-panel__hd">
              <Gauge aria-hidden="true" strokeWidth={1.5} />
              <span className="cmd-panel__t">{t("command.moduleReadouts")}</span>
              <span className="cmd-panel__n">
                T{offsetHours >= 0 ? "+" : "−"}
                {String(Math.abs(offsetHours)).padStart(2, "0")}
              </span>
            </header>
            <div className="cmd-panel__bd">
              {/* Every number here is "as at" the timeline cursor, never live. */}
              <div className="cmd-kv cmd-kv--3">
                {COMMAND_LANES.map((lane) => {
                  const samples = seriesState.series.find((entry) => entry.laneId === lane.id)?.samples ?? [];
                  const value = samples.find((entry) => entry.hour === cursorHour)?.value ?? null;
                  const breached = isBreach(lane, value);
                  return (
                    <div className={breached ? "cmd-kv__c cmd-kv__c--alert" : "cmd-kv__c"} key={lane.id}>
                      <div className="cmd-kv__k">{t(lane.labelKey)}</div>
                      <div className="cmd-kv__v">
                        {value === null ? "—" : value.toFixed(1)}
                        <s>{lane.unit}</s>
                      </div>
                      {lane.threshold ? (
                        <div className="cmd-kv__d">
                          {t("command.limit")} {lane.threshold.value} {lane.unit}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {seriesState.isLoading ? <p className="cmd-empty">{t("command.loadingSeries")}</p> : null}
              {seriesState.error ? <p className="cmd-empty">{seriesState.error}</p> : null}
              <p className="cmd-empty">{t("command.provenanceNote")}</p>
            </div>
          </section>
        ) : null}

        <div className="cmd-hud cmd-hud--bl">
          {/* The canon folds the first row away below 1560px as secondary
              furniture, so only what is genuinely secondary goes in it. */}
          <div className="cmd-hud__row">
            {definition ? (
              <span className="cmd-pill">
                <s>{t("map.layer")}</s>
                {t(definition.labelKey)}
              </span>
            ) : null}
          </div>
          <div className="cmd-hud__row">
            {scale ? (
              <div className="cmd-scale">
                <span className="cmd-scale__l">
                  {scale.label.value} {scale.label.unit}
                </span>
                <div aria-hidden="true" className="cmd-scale__b" style={{ width: `${String(scale.widthPx)}px` }}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ) : null}
            <span className="cmd-pill">
              <s>{t("map.centre")}</s>
              {formatCoordinate(centre)}
            </span>
          </div>
        </div>

        <CommandTimeline
          alerts={alerts}
          bands={bands}
          hours={hours}
          isCollapsed={isTimelineCollapsed}
          isPlaying={isPlaying}
          nowHour={nowHour}
          onCollapseToggle={() => setIsTimelineCollapsed((value) => !value)}
          onHourChange={setHour}
          onPlayToggle={() => setIsPlaying((value) => !value)}
          onSnapToNow={snapToNow}
          selectedHour={cursorHour}
          series={seriesState.series}
          validDate={validDate}
        />
      </div>

      <button className="cmd__clearbtn" onClick={() => setIsClear(false)} type="button">
        <Eye aria-hidden="true" strokeWidth={1.5} />
        {t("command.restoreChrome")}
      </button>
    </div>
  );
}
