import { describe, expect, it } from "vitest";
import { illuminationBands, illuminationPhase, solarPosition } from "./solar";

const LEON = { lat: 42.6, lng: -5.57 };
const EQUATOR = { lat: 0, lng: 0 };

describe("solarPosition", () => {
  it("puts the sun near the zenith at the equator on an equinox noon", () => {
    // 2026 March equinox: the subsolar point sits on the equator.
    const { altitude } = solarPosition(new Date("2026-03-20T12:00:00Z"), EQUATOR);
    expect(altitude).toBeGreaterThan(87);
  });

  it("reads southern at local solar noon in the northern hemisphere", () => {
    const { altitude, azimuth } = solarPosition(new Date("2026-06-21T12:22:00Z"), LEON);
    expect(altitude).toBeGreaterThan(65);
    expect(azimuth).toBeGreaterThan(160);
    expect(azimuth).toBeLessThan(200);
  });

  it("is below the horizon at local midnight", () => {
    expect(solarPosition(new Date("2026-06-21T00:22:00Z"), LEON).altitude).toBeLessThan(0);
  });

  it("puts the summer sun far higher than the winter sun at the same hour", () => {
    const summer = solarPosition(new Date("2026-06-21T12:00:00Z"), LEON).altitude;
    const winter = solarPosition(new Date("2026-12-21T12:00:00Z"), LEON).altitude;
    expect(summer - winter).toBeGreaterThan(40);
  });

  it("keeps the azimuth within a full turn", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const { azimuth } = solarPosition(new Date(Date.UTC(2026, 4, 15, hour)), LEON);
      expect(azimuth).toBeGreaterThanOrEqual(0);
      expect(azimuth).toBeLessThan(360);
    }
  });

  it("tracks eastwards through the morning", () => {
    const early = solarPosition(new Date("2026-06-21T07:00:00Z"), LEON).azimuth;
    const later = solarPosition(new Date("2026-06-21T10:00:00Z"), LEON).azimuth;
    expect(later).toBeGreaterThan(early);
  });
});

describe("illuminationPhase", () => {
  it("splits at the refracted horizon and at civil twilight", () => {
    expect(illuminationPhase(10)).toBe("day");
    expect(illuminationPhase(0)).toBe("day");
    expect(illuminationPhase(-0.9)).toBe("twilight");
    expect(illuminationPhase(-5.9)).toBe("twilight");
    expect(illuminationPhase(-6.1)).toBe("night");
  });
});

describe("illuminationBands", () => {
  it("covers the whole window with contiguous bands", () => {
    const bands = illuminationBands(
      new Date("2026-06-21T00:00:00Z"),
      new Date("2026-06-22T00:00:00Z"),
      LEON,
    );

    expect(bands[0].start).toBe(0);
    expect(bands[bands.length - 1].end).toBe(1);
    bands.slice(1).forEach((band, index) => {
      expect(band.start).toBe(bands[index].end);
    });
  });

  it("finds night, twilight and day across a summer day", () => {
    const phases = new Set(
      illuminationBands(
        new Date("2026-06-21T00:00:00Z"),
        new Date("2026-06-22T00:00:00Z"),
        LEON,
      ).map((band) => band.phase),
    );

    expect(phases).toEqual(new Set(["night", "twilight", "day"]));
  });

  it("reports polar day as a single band", () => {
    const bands = illuminationBands(
      new Date("2026-06-21T00:00:00Z"),
      new Date("2026-06-22T00:00:00Z"),
      { lat: 78.2, lng: 15.6 },
    );

    expect(bands).toHaveLength(1);
    expect(bands[0].phase).toBe("day");
  });

  it("returns nothing for a window that does not advance", () => {
    const at = new Date("2026-06-21T00:00:00Z");
    expect(illuminationBands(at, at, LEON)).toEqual([]);
  });
});
