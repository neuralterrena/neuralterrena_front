import { describe, expect, it } from "vitest";
import { readMapConfiguration } from "./config";

describe("readMapConfiguration", () => {
  it("uses the configured map style and initial camera", () => {
    expect(
      readMapConfiguration({
        VITE_MAP_INITIAL_CENTER: "-3.7,40.4",
        VITE_MAP_INITIAL_ZOOM: "7",
        VITE_MAP_STYLE_URL: "https://maps.example.test/style.json",
      }),
    ).toEqual({
      initialView: { center: [-3.7, 40.4], zoom: 7 },
      styleUrl: "https://maps.example.test/style.json",
    });
  });

  it("falls back to a neutral global camera for invalid values", () => {
    expect(
      readMapConfiguration({
        VITE_MAP_INITIAL_CENTER: "not-a-coordinate",
        VITE_MAP_INITIAL_ZOOM: "100",
        VITE_MAP_STYLE_URL: "   ",
      }),
    ).toEqual({
      initialView: { center: [-4.85, 43.17], zoom: 10 },
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    });
  });
});
