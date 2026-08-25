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
    ).toMatchObject({
      basemaps: [
        {
          id: "topographic",
          labelKey: "map.basemapTopographic",
          styleUrl: "https://maps.example.test/style.json",
        },
      ],
      forecastHubApiBaseUrl: "",
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
    ).toMatchObject({
      forecastHubApiBaseUrl: "",
      initialView: { center: [-4.85, 43.17], zoom: 10 },
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    });
  });
});

describe("basemaps", () => {
  it("offers only the base style when no extra basemap is configured", () => {
    const { basemaps } = readMapConfiguration({ VITE_MAP_STYLE_URL: "https://maps.example.test/a.json" });
    expect(basemaps.map((basemap) => basemap.id)).toEqual(["topographic"]);
  });

  it("adds an option per configured style, in canon order", () => {
    const { basemaps } = readMapConfiguration({
      VITE_MAP_STYLE_DARK_URL: "https://maps.example.test/dark.json",
      VITE_MAP_STYLE_SATELLITE_URL: "https://maps.example.test/sat.json",
      VITE_MAP_STYLE_TERRAIN_URL: "https://maps.example.test/terrain.json",
      VITE_MAP_STYLE_URL: "https://maps.example.test/topo.json",
    });

    expect(basemaps.map((basemap) => basemap.id)).toEqual(["topographic", "terrain", "satellite", "dark"]);
    expect(basemaps.map((basemap) => basemap.styleUrl)).toEqual([
      "https://maps.example.test/topo.json",
      "https://maps.example.test/terrain.json",
      "https://maps.example.test/sat.json",
      "https://maps.example.test/dark.json",
    ]);
  });

  it("ignores blank style URLs rather than offering a broken option", () => {
    const { basemaps } = readMapConfiguration({
      VITE_MAP_STYLE_SATELLITE_URL: "   ",
      VITE_MAP_STYLE_TERRAIN_URL: "",
      VITE_MAP_STYLE_URL: "https://maps.example.test/topo.json",
    });

    expect(basemaps.map((basemap) => basemap.id)).toEqual(["topographic"]);
  });
});
