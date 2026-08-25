import type { LngLat } from "./geodesy";

/**
 * Coordinate parsing and formatting for the map search field and the readout
 * pill.
 *
 * The canon's search accepts place, address and coordinates. There is no
 * geocoding service behind this console yet, so only the coordinate branch
 * resolves; the caller is responsible for telling the user that place search
 * is unavailable rather than silently returning nothing.
 */

export interface ParsedCoordinate {
  point: LngLat;
  /** Which notation matched, so the result row can say how it was read. */
  notation: "decimal" | "dms";
}

const DECIMAL = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

// 43°10'12"N 4°51'00"W — separators are deliberately loose because operators
// paste these from many sources.
const DMS_PART = String.raw`(\d+(?:\.\d+)?)\s*[°º:\s]\s*(?:(\d+(?:\.\d+)?)\s*['′:\s]\s*)?(?:(\d+(?:\.\d+)?)\s*["″]?\s*)?([NSEWnsew])`;
const DMS = new RegExp(`^\\s*${DMS_PART}\\s*[,;\\s]\\s*${DMS_PART}\\s*$`);

const isLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;
const isLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;

function dmsToDecimal(degrees: string, minutes: string | undefined, seconds: string | undefined, hemisphere: string) {
  const decimal =
    Number(degrees) + Number(minutes ?? 0) / 60 + Number(seconds ?? 0) / 3600;
  const sign = /[SWsw]/.test(hemisphere) ? -1 : 1;
  return decimal * sign;
}

/**
 * Parse a coordinate written as decimal degrees (`43.17, -4.85`) or as
 * degrees/minutes/seconds with hemispheres (`43°10'12"N 4°51'W`).
 *
 * Decimal input is read as `lat, lon` — the order every mapping tool prints
 * and the one operators type. Returns null when the text is not a coordinate
 * or the values fall outside the valid ranges.
 */
export function parseCoordinate(input: string): ParsedCoordinate | null {
  const decimal = DECIMAL.exec(input);
  if (decimal) {
    const lat = Number(decimal[1]);
    const lng = Number(decimal[2]);
    return isLatitude(lat) && isLongitude(lng) ? { notation: "decimal", point: { lat, lng } } : null;
  }

  const dms = DMS.exec(input);
  if (!dms) {
    return null;
  }

  const first = dmsToDecimal(dms[1], dms[2], dms[3], dms[4]);
  const second = dmsToDecimal(dms[5], dms[6], dms[7], dms[8]);

  // Hemisphere letters carry the axis, so accept either order.
  const firstIsLatitude = /[NSns]/.test(dms[4]);
  const lat = firstIsLatitude ? first : second;
  const lng = firstIsLatitude ? second : first;

  if (firstIsLatitude === /[NSns]/.test(dms[8])) {
    return null;
  }

  return isLatitude(lat) && isLongitude(lng) ? { notation: "dms", point: { lat, lng } } : null;
}

/** `43.1700 N · 4.8500 W` — the readout format for the coordinate pill. */
export function formatCoordinate(point: LngLat, fractionDigits = 4): string {
  const lat = `${Math.abs(point.lat).toFixed(fractionDigits)} ${point.lat < 0 ? "S" : "N"}`;
  const lng = `${Math.abs(point.lng).toFixed(fractionDigits)} ${point.lng < 0 ? "W" : "E"}`;
  return `${lat} · ${lng}`;
}
