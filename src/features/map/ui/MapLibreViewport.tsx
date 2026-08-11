import { useEffect, useRef } from "react";
import {
  type ErrorEvent,
  Map,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { MapConfiguration, MapProjection } from "../model/config";
import { OROGRAPHY_LAYER_ID, OROGRAPHY_SOURCE_ID } from "../model/layers";

setWorkerUrl(workerUrl);

function addOrographyLayer(map: Map) {
  if (map.getSource(OROGRAPHY_SOURCE_ID)) {
    return;
  }

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
  map.setTerrain({
    exaggeration: 1.5,
    source: OROGRAPHY_SOURCE_ID,
  });
}

interface MapLibreViewportProps {
  configuration: MapConfiguration;
  projection: MapProjection;
  onError: (message: string) => void;
}

export function MapLibreViewport({
  configuration,
  projection,
  onError,
}: MapLibreViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

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
      zoom: configuration.initialView.zoom,
    });
    const navigation = new NavigationControl({ showCompass: true, showZoom: true });
    map.addControl(navigation, "top-right");
    map.once("load", () => addOrographyLayer(map));
    map.on("error", (event: ErrorEvent) => {
      const message = event.error?.message || "No se pudo cargar el estilo del mapa.";
      onErrorRef.current(message);
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [configuration.initialView.center, configuration.initialView.zoom, configuration.styleUrl]);

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
  }, [projection]);

  return <div aria-label="Mapa interactivo" className="map-viewport" ref={containerRef} role="application" />;
}
