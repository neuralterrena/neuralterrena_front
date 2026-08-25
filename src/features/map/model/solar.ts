/**
 * Solar position and the day / twilight / night classification behind the
 * command view's illumination strip.
 *
 * This is the one operational variable the console can derive with no backend
 * at all: it is astronomy, not forecast. Values follow the NOAA solar position
 * algorithm, accurate to well under a minute for civil purposes — far tighter
 * than the hourly resolution the timeline renders.
 */

import type { LngLat } from "./geodesy";

export type IlluminationPhase = "day" | "twilight" | "night";

export interface SolarPosition {
  /** Degrees above the horizon; negative when the sun has set. */
  altitude: number;
  /** Degrees clockwise from true north. */
  azimuth: number;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Julian day for an instant, the time base the NOAA formulas expect. */
function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function solarPosition(date: Date, point: LngLat): SolarPosition {
  // Julian centuries since J2000.0
  const t = (julianDay(date) - 2_451_545) / 36_525;

  const meanLongitude = (280.46646 + t * (36_000.76983 + t * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + t * (35_999.05029 - t * 0.0001537);

  const centre =
    Math.sin(meanAnomaly * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnomaly * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomaly * RAD) * 0.000289;

  const trueLongitude = meanLongitude + centre;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);

  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(apparentLongitude * RAD)) * DEG;

  // Equation of time, in minutes.
  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const equationOfTime =
    4 *
    DEG *
    (y * Math.sin(2 * meanLongitude * RAD) -
      2 * eccentricity * Math.sin(meanAnomaly * RAD) +
      4 * eccentricity * y * Math.sin(meanAnomaly * RAD) * Math.cos(2 * meanLongitude * RAD) -
      0.5 * y * y * Math.sin(4 * meanLongitude * RAD) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * RAD));

  const utcMinutes =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarTime = (utcMinutes + equationOfTime + 4 * point.lng + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 - 180;

  const latitude = point.lat * RAD;
  const declinationRad = declination * RAD;
  const hourAngleRad = hourAngle * RAD;

  const cosZenith =
    Math.sin(latitude) * Math.sin(declinationRad) +
    Math.cos(latitude) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const altitude = 90 - zenith * DEG;

  const denominator = Math.sin(zenith) * Math.cos(latitude);
  const azimuth =
    Math.abs(denominator) < 1e-9
      ? 0
      : (() => {
          const cosAzimuth =
            (Math.sin(latitude) * Math.cos(zenith) - Math.sin(declinationRad)) / denominator;
          const base = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * DEG;
          return hourAngle > 0 ? (base + 180) % 360 : (540 - base) % 360;
        })();

  return { altitude, azimuth };
}

/**
 * Civil twilight is the operational threshold: below −6° there is not enough
 * light to work without artificial illumination, which is the distinction the
 * strip needs to make. Refraction at the horizon is why sunrise is −0.833°.
 */
export function illuminationPhase(altitude: number): IlluminationPhase {
  if (altitude > -0.833) {
    return "day";
  }
  return altitude > -6 ? "twilight" : "night";
}

export interface IlluminationBand {
  phase: IlluminationPhase;
  /** Fraction of the window where the band starts and ends, 0–1. */
  start: number;
  end: number;
}

/**
 * Collapse a window into contiguous illumination bands, so the strip renders
 * as a handful of blocks rather than one element per sample.
 */
export function illuminationBands(
  from: Date,
  to: Date,
  point: LngLat,
  samples = 96,
): IlluminationBand[] {
  const span = to.getTime() - from.getTime();
  if (span <= 0 || samples < 2) {
    return [];
  }

  const bands: IlluminationBand[] = [];

  for (let index = 0; index < samples; index += 1) {
    const fraction = index / (samples - 1);
    const at = new Date(from.getTime() + span * fraction);
    const phase = illuminationPhase(solarPosition(at, point).altitude);
    const previous = bands[bands.length - 1];

    if (previous && previous.phase === phase) {
      previous.end = fraction;
    } else {
      bands.push({ end: fraction, phase, start: previous ? previous.end : 0 });
    }
  }

  return bands;
}
