import { describe, expect, it } from "vitest";
import {
  bearingDegrees,
  circleRing,
  destinationPoint,
  distanceMeters,
  formatArea,
  formatBearing,
  formatDistance,
  metersPerPixel,
  pathLengthMeters,
  polygonAreaSquareMeters,
  scaleBarStep,
} from "./geodesy";

describe("distanceMeters", () => {
  it("matches a known great-circle distance", () => {
    // Madrid → Barcelona is ~505 km; allow 1% for the spherical model.
    const madrid = { lat: 40.4168, lng: -3.7038 };
    const barcelona = { lat: 41.3874, lng: 2.1686 };
    expect(distanceMeters(madrid, barcelona)).toBeCloseTo(504_600, -4);
  });

  it("is zero for the same point and symmetric between two points", () => {
    const a = { lat: 43.17, lng: -4.85 };
    const b = { lat: 43.2, lng: -4.9 };
    expect(distanceMeters(a, a)).toBe(0);
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });

  it("measures a degree of latitude as ~111 km anywhere", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -2);
    expect(distanceMeters({ lat: 60, lng: 20 }, { lat: 61, lng: 20 })).toBeCloseTo(111_195, -2);
  });
});

describe("pathLengthMeters", () => {
  it("is zero for fewer than two points", () => {
    expect(pathLengthMeters([])).toBe(0);
    expect(pathLengthMeters([{ lat: 43, lng: -4 }])).toBe(0);
  });

  it("sums the legs of a path", () => {
    const points = [
      { lat: 43, lng: -4 },
      { lat: 44, lng: -4 },
      { lat: 45, lng: -4 },
    ];
    expect(pathLengthMeters(points)).toBeCloseTo(2 * distanceMeters(points[0], points[1]), 0);
  });
});

describe("polygonAreaSquareMeters", () => {
  it("is zero below three points", () => {
    expect(polygonAreaSquareMeters([{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }])).toBe(0);
  });

  it("measures a one-degree square near the equator", () => {
    // A 1°×1° cell at the equator is ~12,300 km².
    const area = polygonAreaSquareMeters([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 1, lng: 0 },
    ]);
    expect(area / 1_000_000).toBeCloseTo(12_363, -2);
  });

  it("does not depend on winding direction", () => {
    const ring = [
      { lat: 43, lng: -4 },
      { lat: 43, lng: -3 },
      { lat: 44, lng: -3 },
    ];
    expect(polygonAreaSquareMeters(ring)).toBeCloseTo(polygonAreaSquareMeters([...ring].reverse()), 0);
  });
});

describe("bearingDegrees", () => {
  it("reads cardinal directions", () => {
    expect(bearingDegrees({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 5);
    expect(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 5);
    expect(bearingDegrees({ lat: 1, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(180, 5);
    expect(bearingDegrees({ lat: 0, lng: 1 }, { lat: 0, lng: 0 })).toBeCloseTo(270, 5);
  });
});

describe("destinationPoint and circleRing", () => {
  it("round-trips through distance", () => {
    const origin = { lat: 43.17, lng: -4.85 };
    const target = destinationPoint(origin, 25_000, 42);
    expect(distanceMeters(origin, target)).toBeCloseTo(25_000, 3);
    expect(bearingDegrees(origin, target)).toBeCloseTo(42, 6);
  });

  it("builds a ring whose every vertex sits at the radius", () => {
    const centre = { lat: 43.17, lng: -4.85 };
    const ring = circleRing(centre, 10_000, 8);
    expect(ring).toHaveLength(8);
    ring.forEach((point) => expect(distanceMeters(centre, point)).toBeCloseTo(10_000, 3));
  });
});

describe("formatting", () => {
  it("switches distance units at a kilometre", () => {
    expect(formatDistance(0)).toEqual({ unit: "m", value: "0" });
    expect(formatDistance(4.2)).toEqual({ unit: "m", value: "4.2" });
    expect(formatDistance(940)).toEqual({ unit: "m", value: "940" });
    expect(formatDistance(1500)).toEqual({ unit: "km", value: "1.50" });
    expect(formatDistance(250_000)).toEqual({ unit: "km", value: "250" });
  });

  it("switches area units at a hectare and a square kilometre", () => {
    expect(formatArea(0)).toEqual({ unit: "m²", value: "0" });
    expect(formatArea(4200)).toEqual({ unit: "m²", value: "4200" });
    expect(formatArea(50_000)).toEqual({ unit: "ha", value: "5.00" });
    expect(formatArea(2_500_000)).toEqual({ unit: "km²", value: "2.50" });
  });

  it("pads bearings to three digits and wraps them", () => {
    expect(formatBearing(7)).toEqual({ unit: "°", value: "007" });
    expect(formatBearing(359.6)).toEqual({ unit: "°", value: "360" });
    expect(formatBearing(-90)).toEqual({ unit: "°", value: "270" });
    expect(formatBearing(450)).toEqual({ unit: "°", value: "090" });
  });
});

describe("scaleBarStep", () => {
  it("picks a round step that fits the available width", () => {
    const step = scaleBarStep(metersPerPixel(43.17, 10), 120);
    expect(step.label).toEqual({ unit: "km", value: "5" });
    expect(step.widthPx).toBeLessThanOrEqual(120);
  });

  it("never reports trailing zeros on a round step", () => {
    [0, 5, 10, 15].forEach((zoom) => {
      expect(scaleBarStep(metersPerPixel(40, zoom), 120).label.value).not.toContain(".");
    });
  });

  it("degrades to zero width for an unusable resolution", () => {
    expect(scaleBarStep(0, 120).widthPx).toBe(0);
    expect(scaleBarStep(Number.NaN, 120).widthPx).toBe(0);
  });
});
