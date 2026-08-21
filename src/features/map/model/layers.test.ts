import { describe, expect, it } from "vitest";
import type { RunInfo } from "../api/forecastMapApi";
import { forecastLayerDefinitions, forecastValidDate, selectLayer, TEMPERATURE_RANGE } from "./layers";

const run: RunInfo = {
  created_at: "2026-08-15T00:00:00Z",
  forecast_hours: [0, 3],
  layers: ["temperature_2m", "precipitation_accumulated"],
  forecast_layers: { "0": ["temperature_2m"], "3": ["precipitation_accumulated"] },
};

describe("forecast layer selection", () => {
  it("prefers 2 m temperature and only considers the selected forecast hour", () => {
    expect(selectLayer(run, 0)).toBe("temperature_2m");
    expect(selectLayer(run, 3)).toBe("precipitation_accumulated");
  });

  it("derives valid time from the UTC cycle", () => {
    expect(forecastValidDate("2026081500", 3)?.toISOString()).toBe("2026-08-15T03:00:00.000Z");
  });

  it("uses one colour scale range for every temperature level", () => {
    const temperatures = forecastLayerDefinitions.filter((layer) => layer.visualizationGroup === "temperature");
    expect(temperatures).toHaveLength(4);
    expect(temperatures.every((layer) => layer.defaultRange === TEMPERATURE_RANGE)).toBe(true);
  });
});
