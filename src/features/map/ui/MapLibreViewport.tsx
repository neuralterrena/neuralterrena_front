import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  type ErrorEvent,
  Map,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { MapConfiguration, MapProjection } from "../model/config";
import { OROGRAPHY_LAYER_ID, OROGRAPHY_SOURCE_ID } from "../model/layers";
import type { WindField } from "../api/forecastMapApi";
import { WindParticles } from "./WindParticles";
import { authService } from "../../auth/model/authService";
import { apiClient } from "../../auth/api/apiClient";
import { useLanguage, useTheme } from "@/shared/providers";

const FORECAST_SOURCE_ID_PREFIX = "forecast-raster-";
const FORECAST_LAYER_ID_PREFIX = "forecast-raster-layer-";
const FORECAST_OPACITY = 0.72;
const RASTER_TRANSITION_MS = 280;

function forecastSourceId(slot: number) {
  return `${FORECAST_SOURCE_ID_PREFIX}${slot}`;
}

function forecastLayerId(slot: number) {
  return `${FORECAST_LAYER_ID_PREFIX}${slot}`;
}

function tileX(longitude: number, zoom: number) {
  const tiles = 2 ** zoom;
  return Math.max(0, Math.min(tiles - 1, Math.floor(((longitude + 180) / 360) * tiles)));
}

function tileY(latitude: number, zoom: number) {
  const tiles = 2 ** zoom;
  const boundedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const radians = (boundedLatitude * Math.PI) / 180;
  return Math.max(0, Math.min(tiles - 1, Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) * tiles / 2)));
}

function visibleTileUrls(map: Map, template: string) {
  const zoom = Math.min(8, Math.max(0, Math.floor(map.getZoom())));
  const bounds = map.getBounds();
  const minX = tileX(bounds.getWest(), zoom);
  const maxX = tileX(bounds.getEast(), zoom);
  const minY = tileY(bounds.getNorth(), zoom);
  const maxY = tileY(bounds.getSouth(), zoom);
  const urls: string[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      urls.push(template.replaceAll("{z}", String(zoom)).replaceAll("{x}", String(x)).replaceAll("{y}", String(y)));
    }
  }

  return urls;
}

setWorkerUrl(workerUrl);

function addOrographyLayer(map: Map) {
  if (!map.getSource(OROGRAPHY_SOURCE_ID)) {
    map.addSource(OROGRAPHY_SOURCE_ID, {
      encoding: "terrarium",
      maxzoom: 15,
      tileSize: 256,
      tiles: [
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      ],
      type: "raster-dem",
    });
    map.addLayer({
      id: OROGRAPHY_LAYER_ID,
      paint: {
        "hillshade-accent-color": "#4d6171",
        "hillshade-exaggeration": 0.55,
        "hillshade-highlight-color": "#f3efe0",
        "hillshade-illumination-direction": 315,
        "hillshade-shadow-color": "#263746",
      },
      source: OROGRAPHY_SOURCE_ID,
      type: "hillshade",
    });
  }
  map.setTerrain({
    exaggeration: 1.5,
    source: OROGRAPHY_SOURCE_ID,
  });
}

interface MapLibreViewportProps {
  /** Style URL of the selected basemap; changing it reloads the map style. */
  basemapStyleUrl: string;
  compact: boolean;
  configuration: MapConfiguration;
  flat: boolean;
  projection: MapProjection;
  onError: (message: string) => void;
  onMapReady: (map: Map | null) => void;
  /**
   * Fired once a new style has finished loading. Reloading a style discards
   * every custom source and layer, so consumers that draw on the map need the
   * signal to put their own layers back.
   */
  onStyleReload: () => void;
  rasterUrl: string | null;
  rasterUrls: string[];
  windField: WindField | null;
  windMode: "particles" | "arrows";
}

export function MapLibreViewport({
  basemapStyleUrl,
  children,
  compact,
  configuration,
  flat,
  projection,
  onError,
  onMapReady,
  onStyleReload,
  rasterUrl,
  rasterUrls,
  windField,
  windMode,
}: PropsWithChildren<MapLibreViewportProps>) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const onErrorRef = useRef(onError);
  const translateRef = useRef(t);
  const prefetchedTileUrlsRef = useRef(new Set<string>());
  const activeRasterSlotRef = useRef<number | null>(null);
  const rasterRemovalTimersRef = useRef(new globalThis.Map<number, number>());
  const appliedStyleUrlRef = useRef(basemapStyleUrl);
  const onMapReadyRef = useRef(onMapReady);
  const onStyleReloadRef = useRef(onStyleReload);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  // Bumped whenever the style is replaced, so every effect that owns a custom
  // source re-applies it onto the new style.
  const [styleEpoch, setStyleEpoch] = useState(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
    onStyleReloadRef.current = onStyleReload;
  }, [onMapReady, onStyleReload]);

  useEffect(() => () => {
    rasterRemovalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map = new Map({
      center: configuration.initialView.center,
      bearing: -25,
      container: containerRef.current,
      maxPitch: 85,
      pitch: 65,
      style: configuration.styleUrl,
      transformRequest: (url) => {
        const token = authService.getAccessToken();
        if (!token || !configuration.forecastHubApiBaseUrl) return { url };
        const forecastOrigin = new URL(configuration.forecastHubApiBaseUrl).origin;
        if (new URL(url, globalThis.location.origin).origin !== forecastOrigin) return { url };
        return { url, headers: { Authorization: `Bearer ${token}` } };
      },
      zoom: configuration.initialView.zoom,
    });
    map.once("load", () => addOrographyLayer(map));
    map.on("error", (event: ErrorEvent) => {
      const message = event.error?.message || translateRef.current("map.styleLoadError");
      onErrorRef.current(message);
    });
    mapRef.current = map;
    setMapInstance(map);
    onMapReadyRef.current(map);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      onMapReadyRef.current(null);
    };
  }, [configuration.forecastHubApiBaseUrl, configuration.initialView.center, configuration.initialView.zoom, configuration.styleUrl]);

  useEffect(() => {
    const map = mapRef.current;

    // The first style is set in the constructor, so only later changes reach
    // setStyle. Do not gate this on reading the current style: a style is not
    // required to carry a `name`, and most do not.
    if (!map || appliedStyleUrlRef.current === basemapStyleUrl) {
      return undefined;
    }
    appliedStyleUrlRef.current = basemapStyleUrl;

    const handleReady = () => {
      // Every custom source went with the old style.
      activeRasterSlotRef.current = null;
      setStyleEpoch((epoch) => epoch + 1);
      onStyleReloadRef.current();
    };

    map.setStyle(basemapStyleUrl);

    // `style.load` is the point at which the new style is installed and ready
    // to receive sources. `idle` is not: it can fire while the replacement is
    // still loading, and anything added then is wiped by the incoming style.
    map.once("style.load", handleReady);

    return () => {
      map.off("style.load", handleReady);
    };
  }, [basemapStyleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const applyProjection = () => {
      map.setProjection({ type: projection });
    };

    if (map.isStyleLoaded()) {
      applyProjection();
      return;
    }

    map.once("load", applyProjection);
    return () => {
      map.off("load", applyProjection);
    };
  }, [projection, styleEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyTerrain = () => {
      if (flat) {
        map.setTerrain(null);
        map.setPitch(0);
        map.setBearing(0);
        return;
      }

      addOrographyLayer(map);
      map.setPitch(65);
      map.setBearing(-25);
    };

    if (map.isStyleLoaded()) {
      applyTerrain();
      return;
    }

    map.once("load", applyTerrain);
    return () => {
      map.off("load", applyTerrain);
    };
  }, [flat, styleEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const preloadTiles = () => {
      rasterUrls.flatMap((url) => visibleTileUrls(map, url)).forEach((url) => {
        if (prefetchedTileUrlsRef.current.has(url)) return;
        prefetchedTileUrlsRef.current.add(url);
        void apiClient.get(url, { authBaseUrl: configuration.forecastHubApiBaseUrl, cache: "force-cache" })
          .then((response) => response.arrayBuffer())
          .catch(() => prefetchedTileUrlsRef.current.delete(url));
      });
    };
    if (map.isStyleLoaded()) preloadTiles(); else map.once("load", preloadTiles);
    map.on("moveend", preloadTiles);
    return () => {
      map.off("load", preloadTiles);
      map.off("moveend", preloadTiles);
    };
  }, [configuration.forecastHubApiBaseUrl, mapInstance, rasterUrls]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const removeRasterSlot = (slot: number) => {
      const layerId = forecastLayerId(slot);
      const sourceId = forecastSourceId(slot);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };

    const updateRasterLayer = () => {
      if (!rasterUrl) {
        removeRasterSlot(0);
        removeRasterSlot(1);
        activeRasterSlotRef.current = null;
        return;
      }

      const previousSlot = activeRasterSlotRef.current;
      const nextSlot = previousSlot === 0 ? 1 : 0;
      const pendingRemoval = rasterRemovalTimersRef.current.get(nextSlot);
      if (pendingRemoval) window.clearTimeout(pendingRemoval);
      rasterRemovalTimersRef.current.delete(nextSlot);
      removeRasterSlot(nextSlot);

      const sourceId = forecastSourceId(nextSlot);
      const layerId = forecastLayerId(nextSlot);
      map.addSource(sourceId, { type: "raster", tiles: [rasterUrl], tileSize: 256, maxzoom: 8 });
      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": 0,
          "raster-opacity-transition": { delay: 0, duration: RASTER_TRANSITION_MS },
        },
      });
      activeRasterSlotRef.current = nextSlot;

      window.requestAnimationFrame(() => {
        if (map.getLayer(layerId)) map.setPaintProperty(layerId, "raster-opacity", FORECAST_OPACITY);
      });

      if (previousSlot === null) return;
      const previousLayerId = forecastLayerId(previousSlot);
      if (map.getLayer(previousLayerId)) map.setPaintProperty(previousLayerId, "raster-opacity", 0);
      const timer = window.setTimeout(() => {
        if (activeRasterSlotRef.current !== previousSlot) removeRasterSlot(previousSlot);
        rasterRemovalTimersRef.current.delete(previousSlot);
      }, RASTER_TRANSITION_MS);
      rasterRemovalTimersRef.current.set(previousSlot, timer);
    };

    if (map.isStyleLoaded()) updateRasterLayer(); else map.once("load", updateRasterLayer);
    return () => {
      map.off("load", updateRasterLayer);
    };
  }, [mapInstance, rasterUrl, styleEpoch]);

  return (
    <div
      className={compact ? "nt-map nt-map--bleed nt-map--mobile" : "nt-map nt-map--bleed"}
      data-btn="elevated"
      data-theme={resolvedTheme}
    >
      <div
        aria-label={t("map.interactiveMap")}
        className="nt-map__canvas"
        ref={containerRef}
        role="application"
      />
      {windField ? <WindParticles field={windField} map={mapInstance} mode={windMode} /> : null}
      <div className="nt-map__overlay">{children}</div>
    </div>
  );
}
