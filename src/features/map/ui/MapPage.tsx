import { CalendarClock, ChevronLeft, ChevronRight, Globe2, Layers3, Map as MapIcon, Pause, Play, RotateCw, Wind, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/shared/providers";
import { buildRasterTileUrl, getModels, getRunMetadata, getRuns, getWindField, type ForecastLayer, type ForecastModel, type ForecastModelId, type RasterRange, type RunInfo, type WindField } from "../api/forecastMapApi";
import { readMapConfiguration, type MapProjection } from "../model/config";
import { availableLayers, forecastLayerDefinitions, forecastValidDate, layerById, selectLayer } from "../model/layers";
import { MapLibreViewport } from "./MapLibreViewport";

const configuration = readMapConfiguration();
type MapViewMode = "terrain" | "globe" | "flat";
type WindMode = "particles" | "arrows";

const toMessage = (error: unknown) => error instanceof Error ? error.message : "No se pudieron cargar las predicciones.";
const modelAttribution = (model: ForecastModelId) => model === "gfs" ? "NOAA GFS" : model === "icon-eu" ? "DWD ICON-EU" : model;
const modelLabel = (model: ForecastModel) => model.label || modelAttribution(model.id);

export function MapPage() {
  const { language, t } = useLanguage();
  const [viewMode, setViewMode] = useState<MapViewMode>("flat");
  const [models, setModels] = useState<ForecastModel[]>([]);
  const [model, setModel] = useState<ForecastModelId | null>(null);
  const [runs, setRuns] = useState<[string, RunInfo][]>([]);
  const [metadata, setMetadata] = useState<RunInfo | null>(null);
  const [run, setRun] = useState("");
  const [layer, setLayer] = useState<ForecastLayer | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [rasterUrl, setRasterUrl] = useState<string | null>(null);
  const [range, setRange] = useState<RasterRange | null>(null);
  const [windField, setWindField] = useState<WindField | null>(null);
  const [windEnabled, setWindEnabled] = useState(false);
  const [windMode, setWindMode] = useState<WindMode>("particles");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isForecastPanelOpen, setIsForecastPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const translateRef = useRef(t);
  const projection: MapProjection = viewMode === "globe" ? "globe" : "mercator";
  const timelineHours = useMemo(() => metadata?.forecast_hours ?? [], [metadata]);
  const selectedHour = timelineHours.includes(hour ?? -1) ? hour : (timelineHours[0] ?? null);
  const validLayers = availableLayers(metadata, selectedHour);
  const currentLayer = layer && validLayers.includes(layer) ? layer : selectLayer(metadata, selectedHour);
  const definition = currentLayer ? layerById.get(currentLayer) : undefined;
  const activeLayerLabel = definition ? t(definition.labelKey) : t("map.layersUnavailable");
  const windAvailable = validLayers.includes("wind_u_10m") && validLayers.includes("wind_v_10m");
  const validDate = selectedHour === null ? null : forecastValidDate(run, selectedHour);
  const groupedLayers = [false, true].map((advanced) => forecastLayerDefinitions.filter((candidate) => Boolean(candidate.advanced) === advanced && validLayers.includes(candidate.id)));

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const loadModels = () => {
    if (!configuration.forecastHubApiBaseUrl) return;
    void Promise.resolve().then(() => {
      setIsLoading(true);
      setError(null);
      setNotice(null);
      return getModels(configuration.forecastHubApiBaseUrl);
    }).then((nextModels) => {
      setModels(nextModels);
      setModel(nextModels[0]?.id ?? null);
      if (!nextModels.length) setNotice(translateRef.current("map.dataUnavailable"));
    }).catch((nextError: unknown) => setError(toMessage(nextError)))
      .finally(() => setIsLoading(false));
  };

  useEffect(loadModels, []);

  useEffect(() => {
    if (!model) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      setIsLoading(true);
      setError(null);
      setRuns([]);
      setMetadata(null);
      setRun("");
      setRasterUrl(null);
      setLayer(null);
      setHour(null);
      setWindField(null);
      return getRuns(configuration.forecastHubApiBaseUrl, model, controller.signal);
    }).then((nextRuns) => {
      if (controller.signal.aborted) return;
      setRuns(nextRuns);
      setRun(nextRuns[0]?.[0] ?? "");
      if (!nextRuns.length) setNotice(translateRef.current("map.noRuns").replace("{model}", model));
    }).catch((nextError: unknown) => { if (!controller.signal.aborted) setError(toMessage(nextError)); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [model]);

  useEffect(() => {
    if (!model || !run) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      setIsLoading(true);
      setError(null);
      setMetadata(null);
      setRasterUrl(null);
      return getRunMetadata(configuration.forecastHubApiBaseUrl, model, run, controller.signal);
    }).then((nextMetadata) => {
      if (controller.signal.aborted) return;
      const initialHour = nextMetadata.forecast_hours[0] ?? null;
      setMetadata(nextMetadata);
      setHour(initialHour);
      setLayer(selectLayer(nextMetadata, initialHour));
    }).catch((nextError: unknown) => { if (!controller.signal.aborted) setError(toMessage(nextError)); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [model, run]);

  useEffect(() => {
    if (!model || !currentLayer || selectedHour === null || !definition) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    void Promise.resolve().then(() => {
      setIsLoading(true);
      setNotice(null);
      // The documented tile endpoint has no statistics route. Stable display
      // ranges are therefore deliberately defined by each layer definition.
      const nextRange = definition.defaultRange;
      setRange(nextRange);
      return buildRasterTileUrl(configuration.forecastHubApiBaseUrl, model, run, currentLayer, selectedHour, nextRange, definition.palette);
    }).then((url) => { if (!controller.signal.aborted) setRasterUrl(url); })
      .catch((nextError: unknown) => { if (!controller.signal.aborted) setError(toMessage(nextError)); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [currentLayer, definition, model, run, selectedHour]);

  useEffect(() => {
    if (!model || !windEnabled || !windAvailable || selectedHour === null || !run) {
      void Promise.resolve().then(() => setWindField(null));
      return;
    }
    const controller = new AbortController();
    void getWindField(configuration.forecastHubApiBaseUrl, model, run, selectedHour, controller.signal)
      .then((field) => { if (!controller.signal.aborted) setWindField(field); })
      .catch((nextError: unknown) => { if (!controller.signal.aborted) { setWindField(null); setNotice(toMessage(nextError)); } });
    return () => controller.abort();
  }, [model, run, selectedHour, windAvailable, windEnabled]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setIsPlaying(false); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!isPlaying || timelineHours.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setHour((current) => timelineHours[(Math.max(0, timelineHours.indexOf(current ?? timelineHours[0])) + 1) % timelineHours.length]), 850);
    return () => window.clearInterval(timer);
  }, [isPlaying, timelineHours]);

  const setForecastHour = (nextHour: number) => {
    const nextLayer = layer && availableLayers(metadata, nextHour).includes(layer) ? layer : selectLayer(metadata, nextHour);
    setHour(nextHour);
    if (nextLayer !== layer) {
      setLayer(nextLayer);
      setNotice(t("map.layerUnavailable").replace("{hour}", String(nextHour)));
    }
  };
  const moveHour = (direction: number) => {
    const index = timelineHours.indexOf(selectedHour ?? timelineHours[0]);
    setForecastHour(timelineHours[(index + direction + timelineHours.length) % timelineHours.length]);
  };

  return <main className="map-page">
    <MapLibreViewport configuration={configuration} flat={viewMode === "flat"} forecastPanelAriaLabel={`${isForecastPanelOpen ? t("map.closeForecastControls") : t("map.openForecastControls")}. ${t("map.currentLayer").replace("{layer}", activeLayerLabel)}`} forecastPanelLabel={activeLayerLabel} forecastPanelOpen={isForecastPanelOpen} onError={setError} onForecastPanelToggle={() => setIsForecastPanelOpen((open) => !open)} projection={projection} rasterUrl={rasterUrl} rasterUrls={[]} windField={windEnabled && windAvailable ? windField : null} windMode={windMode} />
    {models.length ? <>
      {isForecastPanelOpen ? <section aria-label={t("map.forecastPanel")} className="forecast-control" id="forecast-control-panel">
        <header className="forecast-control__header"><div><h2>{t("map.forecast")}</h2><p>{model ? `${modelAttribution(model)} · ${run || t("map.noCycle")}` : t("map.loadingModel")}</p></div><button aria-label={t("map.closeForecastControls")} title={t("map.closeForecastControls")} className="forecast-control__close" onClick={() => setIsForecastPanelOpen(false)} type="button"><X aria-hidden="true" size={17} /></button></header>
        <div className="forecast-control__selectors"><label className="forecast-control__select-field"><span><Layers3 aria-hidden="true" size={15} />{t("map.model")}</span><select aria-label={t("map.model")} onChange={(event) => setModel(event.target.value)} value={model ?? ""}>{models.map((candidate) => <option key={candidate.id} value={candidate.id}>{modelLabel(candidate)}</option>)}</select></label><label className="forecast-control__select-field"><span><CalendarClock aria-hidden="true" size={15} />{t("map.run")}</span><select aria-label={t("map.run")} onChange={(event) => setRun(event.target.value)} value={run}>{runs.map(([id, item]) => <option key={id} value={id}>{id} · {new Date(item.created_at).toLocaleString(language === "en" ? "en-US" : "es-ES")}</option>)}</select></label></div>
        <label className="forecast-control__select-field forecast-control__layer-picker"><span><Layers3 aria-hidden="true" size={15} />{t("map.layer")}</span><select aria-label={t("map.layer")} disabled={!currentLayer} onChange={(event) => { setLayer(event.target.value as ForecastLayer); setNotice(null); }} value={currentLayer ?? ""}>{currentLayer ? null : <option value="">{t("map.layersUnavailable")}</option>}{groupedLayers.map((layers, index) => layers.length ? <optgroup key={index} label={index ? t("map.advancedLayers") : t("map.surface")}>{layers.map((candidate) => <option key={candidate.id} value={candidate.id}>{t(candidate.labelKey)}</option>)}</optgroup> : null)}</select></label>
        <div className="forecast-control__wind"><label className="forecast-control__wind-toggle"><span><Wind aria-hidden="true" size={15} />{t("map.wind")}</span><input checked={windEnabled} disabled={!windAvailable} onChange={(event) => setWindEnabled(event.target.checked)} type="checkbox" /><i aria-hidden="true" /></label>{windEnabled && windAvailable ? <label className="forecast-control__select-field forecast-control__wind-mode"><span>{t("map.windDisplay")}</span><select aria-label={t("map.windDisplay")} onChange={(event) => setWindMode(event.target.value as WindMode)} value={windMode}><option value="particles">{t("map.windParticles")}</option><option value="arrows">{t("map.windArrows")}</option></select></label> : null}{!windAvailable ? <span>{t("map.windUnavailable")}</span> : null}</div>
        <div className="forecast-control__timeline"><span>{t("map.timeLead")}</span><div className="forecast-control__time"><button aria-label={t("map.hourPrevious")} title={t("map.hourPrevious")} disabled={!timelineHours.length} onClick={() => moveHour(-1)} type="button"><ChevronLeft aria-hidden="true" size={16} /></button><input aria-label={t("map.timeLead")} max={Math.max(0, timelineHours.length - 1)} min="0" onChange={(event) => setForecastHour(timelineHours[Number(event.target.value)])} type="range" value={Math.max(0, timelineHours.indexOf(selectedHour ?? -1))} /><button aria-label={t("map.hourNext")} title={t("map.hourNext")} disabled={!timelineHours.length} onClick={() => moveHour(1)} type="button"><ChevronRight aria-hidden="true" size={16} /></button><button aria-label={isPlaying ? t("map.pause") : t("map.play")} title={isPlaying ? t("map.pause") : t("map.play")} disabled={timelineHours.length < 2} onClick={() => setIsPlaying((value) => !value)} type="button">{isPlaying ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}</button><strong>+{selectedHour ?? "---"} h</strong></div>{validDate ? <p className="forecast-control__valid">{t("map.valid")}: {validDate.toLocaleString(language === "en" ? "en-US" : "es-ES", { dateStyle: "medium", timeStyle: "short" })}</p> : null}</div>
      </section> : null}
    </> : null}
    {definition && range ? <aside aria-label={t("map.legend").replace("{layer}", t(definition.labelKey))} className="map-layer-legend"><div><strong>{t(definition.labelKey)}</strong><span>{definition.unit}</span></div><div aria-hidden="true" className="map-layer-legend__scale" /><div className="map-layer-legend__labels"><span>{definition.convert ? definition.convert(range.min).toFixed(0) : range.min}</span><span>{definition.convert ? definition.convert(range.max).toFixed(0) : range.max}</span></div>{definition.descriptionKey ? <small>{t(definition.descriptionKey)}</small> : null}</aside> : null}
    <div aria-label={t("map.projectionMode")} className="map-projection-control" role="group"><button aria-pressed={viewMode === "terrain"} onClick={() => setViewMode("terrain")} type="button"><MapIcon aria-hidden="true" size={17} />{t("map.terrain")}</button><button aria-pressed={viewMode === "globe"} onClick={() => setViewMode("globe")} type="button"><Globe2 aria-hidden="true" size={17} />{t("map.viewGlobe")}</button><button aria-pressed={viewMode === "flat"} onClick={() => setViewMode("flat")} type="button"><MapIcon aria-hidden="true" size={17} />{t("map.flat")}</button></div>
    {model ? <p className="map-attribution">{t("map.attribution")}: {modelAttribution(model)}</p> : null}
    {isLoading ? <div aria-live="polite" className="map-loading-state" role="status">{t("map.updating")}</div> : null}
    {notice ? <div className="map-notice-state" role="status">{notice}</div> : null}
    {error ? <div className="map-error-state" role="alert"><strong>{t("map.forecastErrorTitle")}</strong><span>{error}</span><button onClick={loadModels} type="button"><RotateCw aria-hidden="true" size={15} /> {t("map.retry")}</button></div> : null}
    {!configuration.forecastHubApiBaseUrl ? <div className="map-configuration-state"><h1>{t("map.configTitle")}</h1><p>{t("map.configDescription")}</p></div> : null}
  </main>;
}
