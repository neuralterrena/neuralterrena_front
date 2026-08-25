import type { TranslationKey } from "@/shared/i18n";
import {
  bearingDegrees,
  distanceMeters,
  formatArea,
  formatBearing,
  formatDistance,
  pathLengthMeters,
  polygonAreaSquareMeters,
  type FormattedValue,
  type LngLat,
} from "./geodesy";

export type MeasureMode = "distance" | "area" | "radius";

export const MEASURE_MODES: readonly MeasureMode[] = ["distance", "area", "radius"];

export interface MeasureStat {
  key: TranslationKey;
  value: FormattedValue;
}

export interface MeasureReadout {
  /** Points to draw as a closed ring rather than an open path. */
  closed: boolean;
  hintKey: TranslationKey;
  stats: MeasureStat[];
}

/** How many points each mode needs before it can report anything. */
const MINIMUM_POINTS: Record<MeasureMode, number> = {
  area: 3,
  distance: 2,
  radius: 2,
};

const HINT_KEYS: Record<MeasureMode, TranslationKey> = {
  area: "map.measureHintArea",
  distance: "map.measureHintDistance",
  radius: "map.measureHintRadius",
};

/**
 * Derive the readout for the current measurement.
 *
 * Always returns the full set of stats for the mode so the panel keeps a
 * stable shape while the operator is still placing points — zeros read as
 * "not measured yet", which is quieter than rows appearing and disappearing.
 */
export function measureReadout(mode: MeasureMode, points: readonly LngLat[]): MeasureReadout {
  const ready = points.length >= MINIMUM_POINTS[mode];
  const hintKey = HINT_KEYS[mode];

  if (mode === "distance") {
    const total = ready ? pathLengthMeters(points) : 0;
    const bearing = ready ? bearingDegrees(points[points.length - 2], points[points.length - 1]) : 0;
    return {
      closed: false,
      hintKey,
      stats: [
        { key: "map.measureTotal", value: formatDistance(total) },
        { key: "map.measureLegs", value: { unit: "", value: String(Math.max(0, points.length - 1)) } },
        { key: "map.measureBearing", value: formatBearing(bearing) },
      ],
    };
  }

  if (mode === "area") {
    const area = ready ? polygonAreaSquareMeters(points) : 0;
    const perimeter = ready ? pathLengthMeters([...points, points[0]]) : 0;
    return {
      closed: true,
      hintKey,
      stats: [
        { key: "map.measureArea", value: formatArea(area) },
        { key: "map.measurePerimeter", value: formatDistance(perimeter) },
        { key: "map.measureVertices", value: { unit: "", value: String(points.length) } },
      ],
    };
  }

  const radius = ready ? distanceMeters(points[0], points[points.length - 1]) : 0;
  return {
    closed: false,
    hintKey,
    stats: [
      { key: "map.measureRadius", value: formatDistance(radius) },
      { key: "map.measureArea", value: formatArea(Math.PI * radius * radius) },
      { key: "map.measureCircumference", value: formatDistance(2 * Math.PI * radius) },
    ],
  };
}

/**
 * Radius mode only ever holds a centre and an edge point: a third click starts
 * a new circle rather than accumulating, which matches how the canon's readout
 * reports a single radius.
 */
export function appendMeasurePoint(
  mode: MeasureMode,
  points: readonly LngLat[],
  point: LngLat,
): LngLat[] {
  if (mode === "radius" && points.length >= 2) {
    return [point];
  }
  return [...points, point];
}
