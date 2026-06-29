import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzePoint,
  computeLos,
  computeMcooOverlay,
  computeViewshed,
} from "./analysis";
import {
  buildMoonState,
  buildSolarState,
  getNightOpacity,
} from "./astronomy";
import { TerrainDem } from "./demService";
import { evaluateOperations, getWeather } from "./weather";
import type {
  ActiveTool,
  BasemapMode,
  EngineState,
  GeoPoint,
  LosState,
  MoonState,
  OperationalMetrics,
  OperationAssessment,
  OverlayImageState,
  PointAnalysisResult,
  SolarState,
  SpeedMultiplier,
  TerrainTab,
  ViewshedState,
  WeatherState,
} from "./types";

const UTC_OFFSET = 2;
const INITIAL_POINT = { lat: 43.17, lng: -4.85 };

function minutesToClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.floor(minutes % 60)).padStart(2, "0")}`;
}

function createSimulationDate(baseDate: Date, minutes: number) {
  const next = new Date(baseDate);
  next.setHours(0, 0, 0, 0);
  next.setMinutes(minutes - UTC_OFFSET * 60);
  return next;
}

function formatMetricDate(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function createMetrics(activeLayerCount: number): OperationalMetrics {
  return {
    activeLayers: activeLayerCount,
    timeWindow: "12 h",
    criticalAlerts: 0,
    traceableOutputs: 8,
  };
}

export function useTerrainConsole() {
  const demRef = useRef(new TerrainDem());
  const playIntervalRef = useRef<number | null>(null);
  const viewshedSequenceRef = useRef(0);
  const liveCursorTimeoutRef = useRef<number | null>(null);
  const [basemap, setBasemap] = useState<BasemapMode>("topo");
  const [activeTool, setActiveTool] = useState<ActiveTool>("nav");
  const [activeTab, setActiveTab] = useState<TerrainTab>("sun");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [timeMinutes, setTimeMinutes] = useState(720);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<SpeedMultiplier>(1);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.5);
  const [fontScaleLarge, setFontScaleLarge] = useState(false);
  const [mcooOpacity, setMcooOpacity] = useState(0.5);
  const [viewshedOpacity, setViewshedOpacity] = useState(0.65);
  const [viewshedRadiusKm, setViewshedRadiusKm] = useState(5);
  const [observerHeight, setObserverHeight] = useState(2);
  const [viewshedLiveMode, setViewshedLiveMode] = useState(false);
  const [mcooVisible, setMcooVisible] = useState(false);
  const [viewshedState, setViewshedState] = useState<ViewshedState | null>(null);
  const [mcooOverlay, setMcooOverlay] = useState<OverlayImageState | null>(null);
  const [losState, setLosState] = useState<LosState | null>(null);
  const [losPendingPoint, setLosPendingPoint] = useState<GeoPoint | null>(null);
  const [pointAnalysis, setPointAnalysis] = useState<PointAnalysisResult | null>(null);
  const [engineState, setEngineState] = useState<EngineState>({
    status: "idle",
    message: "Listo",
    progress: 0,
    loadedTileCount: 0,
  });
  const [cursorPoint, setCursorPoint] = useState(INITIAL_POINT);
  const [viewState, setViewState] = useState({
    center: INITIAL_POINT,
    pseudoZoom: 11,
    bounds: {
      west: -5.35,
      east: -4.35,
      south: 42.77,
      north: 43.57,
    },
  });

  const simulationDate = useMemo(() => createSimulationDate(selectedDate, timeMinutes), [selectedDate, timeMinutes]);
  const solarState: SolarState = useMemo(
    () => buildSolarState(simulationDate, viewState.center.lat, viewState.center.lng, UTC_OFFSET),
    [simulationDate, viewState.center.lat, viewState.center.lng],
  );
  const weatherState: WeatherState = useMemo(() => getWeather(selectedDate, timeMinutes), [selectedDate, timeMinutes]);
  const moonState: MoonState = useMemo(
    () => buildMoonState(simulationDate, viewState.center.lat, viewState.center.lng, solarState.altitude, UTC_OFFSET),
    [simulationDate, viewState.center.lat, viewState.center.lng, solarState.altitude],
  );
  const operationAssessments: OperationAssessment[] = useMemo(
    () => evaluateOperations(weatherState, solarState.altitude, moonState.illuminationFraction, moonState.altitude),
    [weatherState, solarState.altitude, moonState.illuminationFraction, moonState.altitude],
  );
  const nightOpacity = useMemo(
    () => getNightOpacity(solarState.altitude, moonState.altitude, moonState.illuminationFraction, weatherState.cloudCover),
    [moonState.altitude, moonState.illuminationFraction, solarState.altitude, weatherState.cloudCover],
  );
  const metrics = useMemo(
    () =>
      createMetrics(
        1 +
          (viewshedState ? 1 : 0) +
          (mcooVisible && mcooOverlay ? 1 : 0) +
          (losState ? 1 : 0) +
          (pointAnalysis ? 1 : 0),
      ),
    [losState, mcooOverlay, mcooVisible, pointAnalysis, viewshedState],
  );

  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current !== null) {
        window.clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    playIntervalRef.current = window.setInterval(() => {
      startTransition(() => {
        setTimeMinutes((current) => (current + speedMultiplier) % 1440);
      });
    }, 50);

    return () => {
      if (playIntervalRef.current !== null) {
        window.clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, speedMultiplier]);

  useEffect(() => {
    document.documentElement.style.setProperty("--nt-map-font-scale", fontScaleLarge ? "1.15" : "1");
  }, [fontScaleLarge]);

  const updateEngineState = useCallback((next: EngineState) => {
    setEngineState(next);
  }, []);

  const runViewshed = useCallback(async (point: GeoPoint, isLive: boolean) => {
    const sequence = ++viewshedSequenceRef.current;

    const result = await computeViewshed(
      demRef.current,
      point.lat,
      point.lng,
      viewshedRadiusKm,
      observerHeight,
      viewshedOpacity,
      isLive,
      (progress) => {
        updateEngineState({
          status: progress.status,
          message: progress.message,
          progress: progress.progress,
          loadedTileCount: progress.loadedTileCount ?? engineState.loadedTileCount,
        });
      },
    );

    if (sequence !== viewshedSequenceRef.current) {
      return;
    }

    setViewshedState(result);
  }, [engineState.loadedTileCount, observerHeight, updateEngineState, viewshedOpacity, viewshedRadiusKm]);

  const runMcoo = useCallback(async () => {
    const overlay = await computeMcooOverlay(demRef.current, viewState.bounds, mcooOpacity, (progress) => {
      updateEngineState({
        status: progress.status,
        message: progress.message,
        progress: progress.progress,
        loadedTileCount: progress.loadedTileCount ?? engineState.loadedTileCount,
      });
    });

    setMcooOverlay(overlay);
  }, [engineState.loadedTileCount, mcooOpacity, updateEngineState, viewState.bounds]);

  const onMapClick = useCallback(async (point: GeoPoint) => {
    if (activeTool === "viewshed") {
      await runViewshed(point, viewshedLiveMode);
      return;
    }

    if (activeTool === "los") {
      if (!losPendingPoint) {
        setLosPendingPoint(point);
        return;
      }

      const result = await computeLos(demRef.current, losPendingPoint, point, (progress) => {
        updateEngineState({
          status: progress.status,
          message: progress.message,
          progress: progress.progress,
          loadedTileCount: engineState.loadedTileCount,
        });
      });
      setLosState(result);
      setLosPendingPoint(null);
      return;
    }

    if (activeTool === "info") {
      await demRef.current.ensureTiles(point.lng - 0.02, point.lng + 0.02, point.lat - 0.02, point.lat + 0.02, 10);
      setPointAnalysis(analyzePoint(demRef.current, point));
    }
  }, [activeTool, engineState.loadedTileCount, losPendingPoint, runViewshed, updateEngineState, viewshedLiveMode]);

  const onMapMove = useCallback((point: GeoPoint) => {
    setCursorPoint(point);

    if (activeTool !== "viewshed" || !viewshedLiveMode) {
      return;
    }

    if (liveCursorTimeoutRef.current !== null) {
      window.clearTimeout(liveCursorTimeoutRef.current);
    }

    liveCursorTimeoutRef.current = window.setTimeout(() => {
      void runViewshed(point, true);
    }, 250);
  }, [activeTool, runViewshed, viewshedLiveMode]);

  useEffect(() => {
    if (!viewshedState) {
      return;
    }

    void runViewshed(viewshedState.point, viewshedState.live);
  }, [observerHeight, runViewshed, viewshedOpacity, viewshedRadiusKm, viewshedState]);

  useEffect(() => {
    if (!mcooVisible) {
      return;
    }

    void runMcoo();
  }, [mcooOpacity, mcooVisible, runMcoo, viewState.bounds]);

  useEffect(
    () => () => {
      if (liveCursorTimeoutRef.current !== null) {
        window.clearTimeout(liveCursorTimeoutRef.current);
      }
    },
    [],
  );

  const clearOperationalState = () => {
    viewshedSequenceRef.current += 1;
    setViewshedState(null);
    setLosState(null);
    setLosPendingPoint(null);
    setPointAnalysis(null);
    setMcooOverlay(null);
    setMcooVisible(false);
    setViewshedLiveMode(false);
    setActiveTool("nav");
    setEngineState({
      status: "idle",
      message: "Limpiado",
      progress: 0,
      loadedTileCount: engineState.loadedTileCount,
    });
  };

  const selectTool = (tool: ActiveTool) => {
    setActiveTool(tool);

    if (tool !== "viewshed") {
      setViewshedLiveMode(false);
    }

    if (tool !== "los") {
      setLosPendingPoint(null);
    }
  };

  const toolStatusMessage =
    activeTool === "viewshed"
      ? viewshedLiveMode
        ? "Mueve el cursor sobre el mapa para recalcular el viewshed."
        : "Haz clic en el mapa para fijar el observador."
      : activeTool === "los"
        ? losPendingPoint
          ? "Selecciona el punto objetivo para completar la LOS."
          : "Selecciona el punto observador."
        : activeTool === "info"
          ? "Haz clic en el mapa para analizar un punto."
          : "";

  return {
    activeTab,
    activeTool,
    basemap,
    cursorPoint,
    engineState,
    fontScaleLarge,
    isPlaying,
    losPendingPoint,
    losState,
    mcooOpacity,
    mcooOverlay,
    mcooVisible,
    metrics,
    moonState,
    nightOpacity,
    observerHeight,
    operationAssessments,
    pointAnalysis,
    selectedDate,
    simulationDate,
    solarState,
    speedMultiplier,
    terrainExaggeration,
    timeMinutes,
    toolStatusMessage,
    viewState,
    viewshedLiveMode,
    viewshedOpacity,
    viewshedRadiusKm,
    viewshedState,
    weatherState,
    setActiveTab,
    setActiveTool: selectTool,
    setBasemap,
    setFontScaleLarge,
    setIsPlaying,
    setMcooOpacity,
    setObserverHeight,
    setSelectedDate,
    setSpeedMultiplier,
    setTerrainExaggeration,
    setTimeMinutes,
    setViewshedLiveMode,
    setViewshedOpacity,
    setViewshedRadiusKm,
    clearOperationalState,
    formatMetricDate,
    minutesToClock,
    onMapClick,
    onMapMove,
    setViewState,
    toggleMcoo: () => {
      const next = !mcooVisible;
      setMcooVisible(next);

      if (!next) {
        setMcooOverlay(null);
      }
    },
  };
}
