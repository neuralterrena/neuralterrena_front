import { describe, expect, it } from "vitest";
import { formatCoordinate, parseCoordinate } from "./coordinates";

describe("parseCoordinate", () => {
  it("reads decimal degrees as latitude then longitude", () => {
    expect(parseCoordinate("43.17, -4.85")).toEqual({
      notation: "decimal",
      point: { lat: 43.17, lng: -4.85 },
    });
  });

  it("accepts the separators operators actually paste", () => {
    const expected = { notation: "decimal", point: { lat: 43.17, lng: -4.85 } };
    expect(parseCoordinate("43.17 -4.85")).toEqual(expected);
    expect(parseCoordinate("43.17;-4.85")).toEqual(expected);
    expect(parseCoordinate("  43.17 , -4.85  ")).toEqual(expected);
  });

  it("reads degrees, minutes and seconds with hemispheres", () => {
    const parsed = parseCoordinate("43°10'12\"N 4°51'00\"W");
    expect(parsed?.notation).toBe("dms");
    expect(parsed?.point.lat).toBeCloseTo(43.17, 4);
    expect(parsed?.point.lng).toBeCloseTo(-4.85, 4);
  });

  it("accepts DMS in either axis order", () => {
    const first = parseCoordinate("4°51'W 43°10'N");
    expect(first?.point.lat).toBeCloseTo(43.1667, 3);
    expect(first?.point.lng).toBeCloseTo(-4.85, 3);
  });

  it("rejects two hemispheres on the same axis", () => {
    expect(parseCoordinate("43°10'N 44°10'N")).toBeNull();
  });

  it("rejects values outside the valid ranges", () => {
    expect(parseCoordinate("91, 0")).toBeNull();
    expect(parseCoordinate("0, 181")).toBeNull();
    expect(parseCoordinate("-91, -181")).toBeNull();
  });

  it("rejects text that is not a coordinate", () => {
    expect(parseCoordinate("León")).toBeNull();
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("43.17")).toBeNull();
    expect(parseCoordinate("calle 43, 17")).toBeNull();
  });
});

describe("formatCoordinate", () => {
  it("renders hemispheres rather than signs", () => {
    expect(formatCoordinate({ lat: 43.17, lng: -4.85 })).toBe("43.1700 N · 4.8500 W");
    expect(formatCoordinate({ lat: -12.5, lng: 33.25 })).toBe("12.5000 S · 33.2500 E");
  });

  it("honours the requested precision", () => {
    // 4.85 is not exactly representable, so toFixed(1) rounds it down — the
    // readout follows the platform rather than inventing its own rounding.
    expect(formatCoordinate({ lat: 43.17, lng: -4.85 }, 1)).toBe("43.2 N · 4.8 W");
    expect(formatCoordinate({ lat: 43.17, lng: -4.85 }, 2)).toBe("43.17 N · 4.85 W");
  });
});
