import { describe, expect, it } from "vitest";
import {
  COMMAND_LANES,
  isBreach,
  laneSegments,
  lanePaths,
  thresholdY,
  type CommandLane,
  type LaneSample,
} from "./commandLanes";

const wind = COMMAND_LANES.find((lane) => lane.id === "wind") as CommandLane;
const temperature = COMMAND_LANES.find((lane) => lane.id === "temperature") as CommandLane;

const sample = (hour: number, value: number | null, provenance: LaneSample["provenance"] = "fct"): LaneSample =>
  ({ hour, provenance, value });

describe("lane definitions", () => {
  it("derives wind speed from both components", () => {
    expect(wind.combine([3, 4])).toBe(5);
    expect(wind.combine([3, null])).toBeNull();
  });

  it("converts temperature out of kelvin", () => {
    expect(temperature.combine([273.15])).toBeCloseTo(0, 10);
  });

  it("only claims a threshold where one is operationally meaningful", () => {
    expect(temperature.threshold).toBeNull();
    expect(wind.threshold).toEqual({ direction: "above", value: 15 });
  });
});

describe("isBreach", () => {
  it("respects the direction of the limit", () => {
    expect(isBreach(wind, 16)).toBe(true);
    expect(isBreach(wind, 15)).toBe(false);
    const floor: CommandLane = { ...wind, threshold: { direction: "below", value: 500 } };
    expect(isBreach(floor, 400)).toBe(true);
    expect(isBreach(floor, 600)).toBe(false);
  });

  it("never reports a breach without a value or without a limit", () => {
    expect(isBreach(wind, null)).toBe(false);
    expect(isBreach(temperature, 999)).toBe(false);
  });
});

describe("laneSegments", () => {
  it("merges contiguous samples that share provenance and breach state", () => {
    const segments = laneSegments(
      [sample(0, 2, "obs"), sample(1, 3, "obs"), sample(2, 4, "fct")],
      wind,
    );

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ breached: false, provenance: "obs", start: 0 });
    expect(segments[0].end).toBeCloseTo(2 / 3, 10);
    expect(segments[1]).toMatchObject({ provenance: "fct" });
    expect(segments[1].end).toBe(1);
  });

  it("reads provenance per sample, not from the side of NOW", () => {
    // A station drops out mid-window and comes back: the hole is its own band.
    const segments = laneSegments(
      [sample(0, 2, "obs"), sample(1, null, "obs"), sample(2, 4, "obs")],
      wind,
    );

    expect(segments.map((segment) => segment.provenance)).toEqual(["obs", "nd", "obs"]);
  });

  it("splits a band where the series crosses the limit", () => {
    const segments = laneSegments([sample(0, 2), sample(1, 20), sample(2, 21)], wind);
    expect(segments.map((segment) => segment.breached)).toEqual([false, true]);
  });

  it("covers the whole width with no gaps between bands", () => {
    const segments = laneSegments([sample(0, 1), sample(1, null), sample(2, 30)], wind);
    expect(segments[0].start).toBe(0);
    expect(segments[segments.length - 1].end).toBe(1);
    segments.slice(1).forEach((segment, index) => {
      expect(segment.start).toBeCloseTo(segments[index].end, 10);
    });
  });

  it("returns nothing for no samples", () => {
    expect(laneSegments([], wind)).toEqual([]);
  });
});

describe("lanePaths", () => {
  it("breaks the path at a gap instead of bridging it", () => {
    const paths = lanePaths([sample(0, 1), sample(1, 2), sample(2, null), sample(3, 4), sample(4, 5)], 30);
    expect(paths).toHaveLength(2);
    expect(paths[0].startsWith("M")).toBe(true);
  });

  it("keeps the stroke inside the lane box", () => {
    const paths = lanePaths([sample(0, 0), sample(1, 100)], 30);
    const ys = [...paths.join(" ").matchAll(/[ML][\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
    ys.forEach((y) => {
      expect(y).toBeGreaterThanOrEqual(2);
      expect(y).toBeLessThanOrEqual(28);
    });
  });

  it("needs at least two finite samples to draw anything", () => {
    expect(lanePaths([sample(0, 1)], 30)).toEqual([]);
    expect(lanePaths([sample(0, null), sample(1, null)], 30)).toEqual([]);
  });
});

describe("thresholdY", () => {
  it("places the rule inside the plotted range", () => {
    const y = thresholdY([sample(0, 0), sample(1, 30)], wind, 30);
    expect(y).not.toBeNull();
    expect(y as number).toBeGreaterThan(2);
    expect(y as number).toBeLessThan(28);
  });

  it("hides the rule when the limit falls outside the plotted range", () => {
    expect(thresholdY([sample(0, 0), sample(1, 5)], wind, 30)).toBeNull();
  });

  it("hides the rule for a lane without a limit", () => {
    expect(thresholdY([sample(0, 0), sample(1, 30)], temperature, 30)).toBeNull();
  });
});
