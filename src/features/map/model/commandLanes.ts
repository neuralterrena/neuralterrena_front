import type { TranslationKey } from "@/shared/i18n";
import type { ForecastLayer } from "../api/forecastMapApi";

/**
 * The timeline lanes of the command view.
 *
 * The canon proposes visibility, wind, T−Td, LOS coverage and ceiling. Of
 * those the Forecast Hub only carries wind, so the lanes here are the
 * operationally meaningful variables that actually exist. Thermal inversion
 * earns its place: it is the one that drives fog and trapped visibility, which
 * is what the missing lanes were there to expose.
 */

export type Provenance = "obs" | "fct" | "nd";

export interface CommandLane {
  id: string;
  labelKey: TranslationKey;
  unit: string;
  /** Hub variables this lane needs; more than one means it is derived. */
  variables: ForecastLayer[];
  /** Combines one sample of each variable, in `variables` order. */
  combine: (values: (number | null)[]) => number | null;
  /**
   * Operational limit. Crossing it shades the lane red.
   *
   * PROVISIONAL: these are defensible defaults, not doctrine. They belong in
   * operational configuration once rules land, and should be reviewed by
   * whoever owns the procedure before this is used to make a call.
   */
  threshold: { direction: "above" | "below"; value: number } | null;
}

const magnitude = (values: (number | null)[]) => {
  const [u, v] = values;
  return u === null || v === null ? null : Math.hypot(u, v);
};

const identity = (values: (number | null)[]) => values[0];

const kelvinToCelsius = (values: (number | null)[]) =>
  values[0] === null ? null : values[0] - 273.15;

export const COMMAND_LANES: readonly CommandLane[] = [
  {
    combine: magnitude,
    id: "wind",
    labelKey: "command.laneWind",
    threshold: { direction: "above", value: 15 },
    unit: "m/s",
    variables: ["wind_u_10m", "wind_v_10m"],
  },
  {
    combine: kelvinToCelsius,
    id: "temperature",
    labelKey: "command.laneTemperature",
    threshold: null,
    unit: "°C",
    variables: ["temperature_2m"],
  },
  {
    combine: identity,
    id: "inversion",
    labelKey: "command.laneInversion",
    threshold: { direction: "above", value: 5 },
    unit: "K",
    variables: ["thermal_inversion_strength"],
  },
  {
    combine: identity,
    id: "precipitation",
    labelKey: "command.lanePrecipitation",
    threshold: { direction: "above", value: 10 },
    unit: "mm",
    variables: ["precipitation_accumulated"],
  },
];

export interface LaneSample {
  hour: number;
  provenance: Provenance;
  value: number | null;
}

export interface LaneSegment {
  breached: boolean;
  /** Fraction of the lane width, 0–1. */
  end: number;
  provenance: Provenance;
  start: number;
}

export function isBreach(lane: CommandLane, value: number | null): boolean {
  if (value === null || !lane.threshold) {
    return false;
  }
  return lane.threshold.direction === "above"
    ? value > lane.threshold.value
    : value < lane.threshold.value;
}

/**
 * Collapse samples into contiguous bands of the same provenance and breach
 * state, so a lane renders as a few elements rather than one per hour.
 *
 * Provenance is read off each sample, never off which side of NOW it falls:
 * a station can drop out mid-window, telemetry can arrive late, and a variable
 * with no station anywhere is forecast end to end.
 */
export function laneSegments(samples: readonly LaneSample[], lane: CommandLane): LaneSegment[] {
  if (samples.length === 0) {
    return [];
  }

  const width = 1 / samples.length;
  const segments: LaneSegment[] = [];

  samples.forEach((sample, index) => {
    const provenance = sample.value === null ? "nd" : sample.provenance;
    const breached = isBreach(lane, sample.value);
    const previous = segments[segments.length - 1];

    if (previous && previous.provenance === provenance && previous.breached === breached) {
      previous.end = (index + 1) * width;
      return;
    }

    segments.push({ breached, end: (index + 1) * width, provenance, start: index * width });
  });

  return segments;
}

export interface LanePoint {
  x: number;
  y: number;
}

/**
 * Project samples onto the lane box. Gaps break the path rather than being
 * bridged, so a missing hour never reads as a straight line through it.
 */
export function lanePaths(samples: readonly LaneSample[], height: number): string[] {
  const finite = samples.filter((sample) => sample.value !== null).map((sample) => sample.value ?? 0);
  if (finite.length < 2) {
    return [];
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  const step = samples.length > 1 ? 100 / (samples.length - 1) : 0;
  const paths: string[] = [];
  let current: string[] = [];

  samples.forEach((sample, index) => {
    if (sample.value === null) {
      if (current.length > 1) paths.push(current.join(" "));
      current = [];
      return;
    }

    // 2px of padding keeps the stroke inside the 30px lane.
    const y = height - 2 - ((sample.value - min) / span) * (height - 4);
    current.push(`${current.length === 0 ? "M" : "L"}${(index * step).toFixed(2)},${y.toFixed(2)}`);
  });

  if (current.length > 1) paths.push(current.join(" "));

  return paths;
}

/** Vertical position of the threshold rule, or null when it is off-scale. */
export function thresholdY(
  samples: readonly LaneSample[],
  lane: CommandLane,
  height: number,
): number | null {
  const finite = samples.filter((sample) => sample.value !== null).map((sample) => sample.value ?? 0);
  if (!lane.threshold || finite.length < 2) {
    return null;
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (lane.threshold.value < min || lane.threshold.value > max) {
    return null;
  }

  const span = max - min || 1;
  return height - 2 - ((lane.threshold.value - min) / span) * (height - 4);
}
