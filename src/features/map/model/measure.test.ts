import { describe, expect, it } from "vitest";
import { appendMeasurePoint, measureReadout } from "./measure";

const A = { lat: 43, lng: -4 };
const B = { lat: 44, lng: -4 };
const C = { lat: 44, lng: -3 };

describe("measureReadout", () => {
  it("keeps a stable set of rows before enough points are placed", () => {
    const empty = measureReadout("distance", []);
    expect(empty.stats.map((stat) => stat.key)).toEqual([
      "map.measureTotal",
      "map.measureLegs",
      "map.measureBearing",
    ]);
    expect(empty.stats.every((stat) => Number(stat.value.value) === 0)).toBe(true);
  });

  it("reports total, legs and the bearing of the last leg for a path", () => {
    const readout = measureReadout("distance", [A, B, C]);
    expect(readout.closed).toBe(false);
    expect(readout.stats[1].value.value).toBe("2");
    // The last leg runs due east.
    expect(readout.stats[2].value.value).toBe("090");
  });

  it("closes the ring and reports perimeter for area mode", () => {
    const readout = measureReadout("area", [A, B, C]);
    expect(readout.closed).toBe(true);
    expect(readout.stats.map((stat) => stat.key)).toEqual([
      "map.measureArea",
      "map.measurePerimeter",
      "map.measureVertices",
    ]);
    expect(readout.stats[2].value.value).toBe("3");
    expect(Number(readout.stats[0].value.value)).toBeGreaterThan(0);
  });

  it("needs three points before an area is reported", () => {
    expect(Number(measureReadout("area", [A, B]).stats[0].value.value)).toBe(0);
  });

  it("derives circumference and area from the measured radius", () => {
    const readout = measureReadout("radius", [A, B]);
    const radiusKm = Number(readout.stats[0].value.value);
    const circumferenceKm = Number(readout.stats[2].value.value);
    expect(radiusKm).toBeGreaterThan(0);
    // Both values are already rounded for display, so compare loosely.
    expect(circumferenceKm).toBeCloseTo(2 * Math.PI * radiusKm, -1);
  });
});

describe("appendMeasurePoint", () => {
  it("accumulates points for distance and area", () => {
    expect(appendMeasurePoint("distance", [A, B], C)).toEqual([A, B, C]);
    expect(appendMeasurePoint("area", [A, B], C)).toEqual([A, B, C]);
  });

  it("starts a new circle once a radius is complete", () => {
    expect(appendMeasurePoint("radius", [A], B)).toEqual([A, B]);
    expect(appendMeasurePoint("radius", [A, B], C)).toEqual([C]);
  });
});
