import { describe, expect, it } from "vitest";
import { evaluateOperations, getWeather } from "./weather";

describe("terrain weather model", () => {
  it("produces deterministic mock weather for a date and time window", () => {
    const weather = getWeather(new Date("2026-06-25T12:00:00Z"), 720);

    expect(weather.temperatureC).toBeTypeOf("number");
    expect(weather.humidity).toBeGreaterThanOrEqual(30);
    expect(weather.humidity).toBeLessThanOrEqual(100);
    expect(weather.visibilityKm).toBeGreaterThan(0);
  });

  it("evaluates the operational matrix with stable labels", () => {
    const weather = getWeather(new Date("2026-06-25T12:00:00Z"), 720);
    const operations = evaluateOperations(weather, -8, 0.4, 25);

    expect(operations).toHaveLength(12);
    expect(operations[0]).toMatchObject({
      name: "Maniobra mecanizada",
    });
    expect(["fav", "mar", "unf"]).toContain(operations[0].status);
  });
});
