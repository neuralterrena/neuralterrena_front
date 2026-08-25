import { RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map } from "maplibre-gl";
import { useLanguage } from "@/shared/providers";
import { buildRasterTileUrl, getModels, getRunMetadata, getRuns, getWindField, type ForecastLayer, type ForecastModel, type ForecastModelId, type RasterRange, type RunInfo, type WindField } from "../api/forecastMapApi";
import { readMapConfiguration, type BasemapId, type MapProjection } from "../model/config";
import { availableLayers, forecastLayerDefinitions, forecastValidDate, layerById, selectLayer } from "../model/layers";
import type { MeasureMode } from "../model/measure";
import { useIsCompactViewport, useMapView } from "../model/useMapView";
import { useMeasure } from "../model/useMeasure";
import { MapControlLayer, type MapViewMode, type PanelId } from "./MapControlLayer";
import { MapLibreViewport } from "./MapLibreViewport";
import { ForecastPanel, type WindMode } from "./controls/ForecastPanel";

const configuration = readMapConfiguration();

const toMessage = (error: unknown) => error instanceof Error ? error.message : "No se pudieron cargar las predicciones.";
const modelAttribution = (model: ForecastModelId) => model === "gfs" ? "NOAA GFS" : model === "icon-eu" ? "DWD ICON-EU" : model;
const modelLabel = (model: ForecastModel) => model.label || modelAttribution(model.id);

export function MapPage() {
  const { t } = useLanguage();
  const compact = useIsCompactViewport();
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
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [styleEpoch, setStyleEpoch] = useState(0);
  const [basemapId, setBasemapId] = useState<BasemapId>(configuration.basemaps[0].id);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [measureMode, setMeasureMode] = useState<MeasureMode>("distance");
  const requestRef = useRef<AbortController | null>(null);
  const translateRef = useRef(t);
  const projection: MapProjection = viewMode === "globe" ? "globe" : "mercator";
  const view = useMapView(map);
  const measure = useMeasure(map, activePanel === "measure", measureMode, styleEpoch);
  const activeBasemap = configuration.basemaps.find((candidate) => candidate.id === basemapId) ?? configuration.basemaps[0];
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

  const forecastPanel = models.length ? (
    <ForecastPanel
      currentLayer={currentLayer}
      groupedLayers={groupedLayers}
      isPlaying={isPlaying}
      model={model}
      modelLabel={modelLabel}
      models={models}
      onHourChange={setForecastHour}
      onLayerChange={(nextLayer) => { setLayer(nextLayer); setNotice(null); }}
      onModelChange={setModel}
      onPlayToggle={() => setIsPlaying((value) => !value)}
      onRunChange={setRun}
      onStep={moveHour}
      onWindModeChange={setWindMode}
      onWindToggle={setWindEnabled}
      run={run}
      runs={runs}
      selectedHour={selectedHour}
      timelineHours={timelineHours}
      validDate={validDate}
      windAvailable={windAvailable}
      windEnabled={windEnabled}
      windMode={windMode}
    />
  ) : (
    <p className="nt-measure-hint">{t("map.loadingModel")}</p>
  );

  const legend = definition && range ? (
    <div aria-label={t("map.legend").replace("{layer}", t(definition.labelKey))} className="nt-mapramp">
      <div className="nt-mapramp__head">
        <span className="nt-mapramp__title">{t(definition.labelKey)}</span>
        <span className="nt-mapramp__unit">{definition.unit}</span>
      </div>
      <div aria-hidden="true" className="nt-mapramp__scale" style={{ background: "linear-gradient(90deg, #352a87, #0f88b5, #f5e663, #d83d42)" }} />
      <div className="nt-mapramp__labels">
        <span>{definition.convert ? definition.convert(range.min).toFixed(0) : range.min}</span>
        <span>{definition.convert ? definition.convert(range.max).toFixed(0) : range.max}</span>
      </div>
      {definition.descriptionKey ? <p className="nt-mapramp__note">{t(definition.descriptionKey)}</p> : null}
      {model ? <p className="nt-mapramp__note">{t("map.attribution")}: {modelAttribution(model)}</p> : null}
    </div>
  ) : null;

  const status = (
    <>
      {isLoading ? <div aria-live="polite" className="nt-mapstatus" role="status">{t("map.updating")}</div> : null}
      {notice ? <div className="nt-mapstatus" role="status">{notice}</div> : null}
      {error ? (
        <div className="nt-mapstatus nt-mapstatus--alert" role="alert">
          <span className="nt-mapstatus__title">{t("map.forecastErrorTitle")}</span>
          <span className="nt-mapstatus__detail">{error}</span>
          <button className="nt-mapstatus__action" onClick={loadModels} type="button">
            <RotateCw aria-hidden="true" strokeWidth={1.5} /> {t("map.retry")}
          </button>
        </div>
      ) : null}
    </>
  );

  return <main className="map-page">
    <MapLibreViewport
      basemapStyleUrl={activeBasemap.styleUrl}
      compact={compact}
      configuration={configuration}
      flat={viewMode === "flat"}
      onError={setError}
      onMapReady={setMap}
      onStyleReload={() => setStyleEpoch((epoch) => epoch + 1)}
      projection={projection}
      rasterUrl={rasterUrl}
      rasterUrls={[]}
      windField={windEnabled && windAvailable ? windField : null}
      windMode={windMode}
    >
      {map ? (
        <MapControlLayer
          activePanel={activePanel}
          basemaps={configuration.basemaps}
          compact={compact}
          forecastPanel={forecastPanel}
          forecastPanelTitle={`${t("map.predictionLayers")} · ${activeLayerLabel}`}
          legend={legend}
          map={map}
          measure={measure}
          measureMode={measureMode}
          onBasemapChange={setBasemapId}
          onMeasureModeChange={setMeasureMode}
          onNotice={setNotice}
          onPanelChange={setActivePanel}
          onViewModeChange={setViewMode}
          selectedBasemap={basemapId}
          status={status}
          view={view}
          viewMode={viewMode}
        />
      ) : null}
      {!configuration.forecastHubApiBaseUrl ? <div className="map-configuration-state"><h1>{t("map.configTitle")}</h1><p>{t("map.configDescription")}</p></div> : null}
    </MapLibreViewport>
  </main>;
}
