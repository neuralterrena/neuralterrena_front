/**
 * Geodesic maths for the measure tool and the scale bar.
 *
 * Everything here is spherical (mean Earth radius), not ellipsoidal. At the
 * ranges this console measures — a few metres to a few hundred kilometres —
 * the error against WGS84 stays under ~0.5%, which is well inside what a
 * hand-drawn measurement on a raster forecast can claim anyway.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

/** Mean Earth radius (IUGG), metres. */
export const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a path, in metres. A path of fewer than 2 points is 0. */
export function pathLengthMeters(points: readonly LngLat[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceMeters(points[index - 1], points[index]);
  }
  return total;
}

/**
 * Area of a closed polygon in square metres, via the spherical excess
 * (L'Huilier / shoelace on the sphere). The ring is closed implicitly, so the
 * caller does not need to repeat the first point. Fewer than 3 points is 0.
 */
export function polygonAreaSquareMeters(points: readonly LngLat[]): number {
  if (points.length < 3) {
    return 0;
  }

  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    total +=
      toRadians(next.lng - current.lng) *
      (2 + Math.sin(toRadians(current.lat)) + Math.sin(toRadians(next.lat)));
  }

  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Initial bearing from `a` to `b`, in degrees clockwise from true north. */
export function bearingDegrees(a: LngLat, b: LngLat): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point reached from `origin` after `meters` along `bearing` (degrees). */
export function destinationPoint(origin: LngLat, meters: number, bearing: number): LngLat {
  const angular = meters / EARTH_RADIUS_M;
  const theta = toRadians(bearing);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(theta),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180 };
}

/** Ring approximating a circle, for drawing a measured radius on the map. */
export function circleRing(centre: LngLat, radiusMeters: number, steps = 64): LngLat[] {
  return Array.from({ length: steps }, (_, index) =>
    destinationPoint(centre, radiusMeters, (index * 360) / steps),
  );
}

export interface FormattedValue {
  unit: string;
  value: string;
}

/** Metres below 1 km, kilometres above. Precision drops as magnitude grows. */
export function formatDistance(meters: number): FormattedValue {
  if (!Number.isFinite(meters) || meters <= 0) {
    return { unit: "m", value: "0" };
  }

  if (meters < 1000) {
    return { unit: "m", value: meters.toFixed(meters < 10 ? 1 : 0) };
  }

  const km = meters / 1000;
  return { unit: "km", value: km.toFixed(km < 10 ? 2 : km < 100 ? 1 : 0) };
}

/** Square metres below 1 hectare, hectares below 1 km², km² above. */
export function formatArea(squareMeters: number): FormattedValue {
  if (!Number.isFinite(squareMeters) || squareMeters <= 0) {
    return { unit: "m²", value: "0" };
  }

  if (squareMeters < 10_000) {
    return { unit: "m²", value: squareMeters.toFixed(0) };
  }

  if (squareMeters < 1_000_000) {
    const hectares = squareMeters / 10_000;
    return { unit: "ha", value: hectares.toFixed(hectares < 10 ? 2 : 1) };
  }

  const squareKm = squareMeters / 1_000_000;
  return { unit: "km²", value: squareKm.toFixed(squareKm < 10 ? 2 : squareKm < 100 ? 1 : 0) };
}

/** Bearing as a zero-padded three-digit value, the way it is read aloud. */
export function formatBearing(degrees: number): FormattedValue {
  const normalized = ((degrees % 360) + 360) % 360;
  return { unit: "°", value: Math.round(normalized).toString().padStart(3, "0") };
}

export interface ScaleBarStep {
  /** Rendered width of the bar, in pixels. */
  widthPx: number;
  label: FormattedValue;
}

const SCALE_STEPS_M = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1_000, 2_000, 5_000, 10_000, 20_000, 50_000,
  100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
];

/**
 * Pick the largest "nice" round distance that fits within `maxWidthPx` at the
 * given resolution, so the bar always reads 1/2/5 × a power of ten rather than
 * an arbitrary number.
 */
export function scaleBarStep(metersPerPixel: number, maxWidthPx: number): ScaleBarStep {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0 || maxWidthPx <= 0) {
    return { label: formatDistance(0), widthPx: 0 };
  }

  const maxMeters = metersPerPixel * maxWidthPx;
  const chosen = [...SCALE_STEPS_M].reverse().find((step) => step <= maxMeters) ?? SCALE_STEPS_M[0];
  const formatted = formatDistance(chosen);

  return {
    // Steps are always 1/2/5 × a power of ten, so the measurement precision
    // that formatDistance applies would only add trailing zeros here.
    label: { unit: formatted.unit, value: String(Number(formatted.value)) },
    widthPx: Math.round(chosen / metersPerPixel),
  };
}

/**
 * Ground resolution at a given latitude and zoom for 512 px Web Mercator
 * tiles, which is what MapLibre vector styles use.
 */
export function metersPerPixel(latitude: number, zoom: number): number {
  return (
    (Math.cos(toRadians(latitude)) * 2 * Math.PI * EARTH_RADIUS_M) /
    (512 * 2 ** zoom)
  );
}
