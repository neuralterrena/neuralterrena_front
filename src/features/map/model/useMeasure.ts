import { useCallback, useEffect, useState } from "react";
import type { GeoJSONSource, Map, MapMouseEvent } from "maplibre-gl";
import { circleRing, distanceMeters, type LngLat } from "./geodesy";
import { appendMeasurePoint, type MeasureMode } from "./measure";

export const MEASURE_SOURCE_ID = "nt-measure";
const FILL_LAYER_ID = "nt-measure-fill";
const LINE_LAYER_ID = "nt-measure-line";
const VERTEX_LAYER_ID = "nt-measure-vertex";

type Geometry =
  | { coordinates: [number, number][]; type: "LineString" }
  | { coordinates: [number, number][][]; type: "Polygon" };

const toPosition = (point: LngLat): [number, number] => [point.lng, point.lat];

/**
 * Build what should be drawn for the current measurement. Radius mode draws
 * the circle it describes rather than the two points that define it, because
 * the circle is what the operator is actually reading off the terrain.
 */
function measureGeometry(mode: MeasureMode, points: readonly LngLat[]): Geometry | null {
  if (points.length < 2) {
    return null;
  }

  if (mode === "radius") {
    const radius = distanceMeters(points[0], points[points.length - 1]);
    return { coordinates: [[...circleRing(points[0], radius), circleRing(points[0], radius)[0]].map(toPosition)], type: "Polygon" };
  }

  if (mode === "area" && points.length >= 3) {
    return { coordinates: [[...points, points[0]].map(toPosition)], type: "Polygon" };
  }

  return { coordinates: points.map(toPosition), type: "LineString" };
}

interface MeasureDrawing {
  mode: MeasureMode;
  points: readonly LngLat[];
}

function syncLayers(map: Map, drawing: MeasureDrawing | null) {
  const geometry = drawing ? measureGeometry(drawing.mode, drawing.points) : null;
  const vertices = drawing?.points ?? [];

  const data = {
    features: [
      ...(geometry ? [{ geometry, properties: { kind: "shape" }, type: "Feature" as const }] : []),
      ...vertices.map((point) => ({
        geometry: { coordinates: toPosition(point), type: "Point" as const },
        properties: { kind: "vertex" },
        type: "Feature" as const,
      })),
    ],
    type: "FeatureCollection" as const,
  };

  const source = map.getSource<GeoJSONSource>(MEASURE_SOURCE_ID);
  if (source) {
    void source.setData(data);
    return;
  }

  map.addSource(MEASURE_SOURCE_ID, { data, type: "geojson" });
  map.addLayer({
    filter: ["==", ["geometry-type"], "Polygon"],
    id: FILL_LAYER_ID,
    paint: { "fill-color": "#1E4F82", "fill-opacity": 0.16 },
    source: MEASURE_SOURCE_ID,
    type: "fill",
  });
  map.addLayer({
    filter: ["!=", ["get", "kind"], "vertex"],
    id: LINE_LAYER_ID,
    paint: { "line-color": "#1E4F82", "line-width": 2 },
    source: MEASURE_SOURCE_ID,
    type: "line",
  });
  map.addLayer({
    filter: ["==", ["get", "kind"], "vertex"],
    id: VERTEX_LAYER_ID,
    paint: {
      "circle-color": "#FFFFFF",
      "circle-radius": 4,
      "circle-stroke-color": "#1E4F82",
      "circle-stroke-width": 2,
    },
    source: MEASURE_SOURCE_ID,
    type: "circle",
  });
}

function removeLayers(map: Map) {
  [VERTEX_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(MEASURE_SOURCE_ID)) map.removeSource(MEASURE_SOURCE_ID);
}

export interface MeasureController {
  clear: () => void;
  points: readonly LngLat[];
  undo: () => void;
}

/**
 * Collect measurement points from map clicks and keep the drawn geometry in
 * step with them.
 *
 * `styleEpoch` exists because switching basemap reloads the style and takes
 * every custom source with it; bumping the epoch re-adds the measure layers on
 * the new style instead of leaving the measurement invisible.
 */
export function useMeasure(
  map: Map | null,
  active: boolean,
  mode: MeasureMode,
  styleEpoch: number,
): MeasureController {
  const [points, setPoints] = useState<readonly LngLat[]>([]);

  // Switching mode or closing the tool discards the measurement: keeping the
  // points would report one mode's statistics over another mode's geometry.
  const session = `${mode}|${String(active)}`;
  const [previousSession, setPreviousSession] = useState(session);
  if (previousSession !== session) {
    setPreviousSession(session);
    setPoints([]);
  }

  useEffect(() => {
    if (!map || !active) {
      return undefined;
    }

    const handleClick = (event: MapMouseEvent) => {
      setPoints((current) =>
        appendMeasurePoint(mode, current, { lat: event.lngLat.lat, lng: event.lngLat.lng }),
      );
    };

    map.on("click", handleClick);
    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      canvas.style.cursor = previousCursor;
    };
  }, [active, map, mode]);

  useEffect(() => {
    if (!map) {
      return undefined;
    }

    const apply = () => {
      if (!active || points.length === 0) {
        removeLayers(map);
        return;
      }
      syncLayers(map, { mode, points });
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("styledata", apply);
    }

    return () => {
      map.off("styledata", apply);
    };
  }, [active, map, mode, points, styleEpoch]);

  useEffect(
    () => () => {
      if (map && map.getSource(MEASURE_SOURCE_ID)) removeLayers(map);
    },
    [map],
  );

  const clear = useCallback(() => setPoints([]), []);
  const undo = useCallback(() => setPoints((current) => current.slice(0, -1)), []);

  return { clear, points, undo };
}
