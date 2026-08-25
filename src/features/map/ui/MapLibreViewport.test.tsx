import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/providers/LanguageProvider";
import { ThemeProvider } from "@/shared/providers/ThemeProvider";

/**
 * Swapping basemap is the most destructive thing this component does: MapLibre
 * throws away every source and layer when a style is replaced, so the hillshade,
 * the forecast raster and any drawn geometry have to be put back afterwards.
 *
 * These tests pin the two mistakes that made that silently not work: gating the
 * swap on a field styles are not required to carry, and re-adding layers on the
 * wrong event.
 */

interface Listener {
  event: string;
  handler: () => void;
}

const onceListeners: Listener[] = [];
const mapMethods = {
  addLayer: vi.fn(),
  addSource: vi.fn(),
  getBounds: vi.fn(() => ({ getEast: () => 1, getNorth: () => 1, getSouth: () => 0, getWest: () => 0 })),
  getCanvas: vi.fn(() => document.createElement("canvas")),
  getLayer: vi.fn(() => undefined),
  getSource: vi.fn(() => undefined),
  getStyle: vi.fn(() => ({ layers: [], sources: {} })),
  getZoom: vi.fn(() => 10),
  isStyleLoaded: vi.fn(() => true),
  off: vi.fn(),
  on: vi.fn(),
  remove: vi.fn(),
  setBearing: vi.fn(),
  setPaintProperty: vi.fn(),
  setPitch: vi.fn(),
  setProjection: vi.fn(),
  setStyle: vi.fn(),
  setTerrain: vi.fn(),
};

class FakeMap {
  constructor() {
    Object.assign(this, mapMethods);
  }

  once(event: string, handler: () => void) {
    onceListeners.push({ event, handler });
    return this;
  }
}

vi.mock("maplibre-gl", () => ({ Map: FakeMap, setWorkerUrl: vi.fn() }));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));
vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({ default: "worker.js" }));
vi.mock("./WindParticles", () => ({ WindParticles: () => null }));

const fire = (event: string) => {
  onceListeners.filter((listener) => listener.event === event).forEach((listener) => { listener.handler(); });
};

const configuration = {
  basemaps: [],
  forecastHubApiBaseUrl: "",
  initialView: { center: [-4.85, 43.17] as [number, number], zoom: 10 },
  styleUrl: "https://tiles.example.test/topographic",
};

const renderViewport = async (basemapStyleUrl: string, onStyleReload = vi.fn()) => {
  const { MapLibreViewport } = await import("./MapLibreViewport");

  const view = render(
    <LanguageProvider>
      <ThemeProvider>
        <MapLibreViewport
          basemapStyleUrl={basemapStyleUrl}
          compact={false}
          configuration={configuration}
          flat
          onError={vi.fn()}
          onMapReady={vi.fn()}
          onStyleReload={onStyleReload}
          projection="mercator"
          rasterUrl={null}
          rasterUrls={[]}
          windField={null}
          windMode="particles"
        />
      </ThemeProvider>
    </LanguageProvider>,
  );

  const rerender = (nextUrl: string) =>
    view.rerender(
      <LanguageProvider>
        <ThemeProvider>
          <MapLibreViewport
            basemapStyleUrl={nextUrl}
            compact={false}
            configuration={configuration}
            flat
            onError={vi.fn()}
            onMapReady={vi.fn()}
            onStyleReload={onStyleReload}
            projection="mercator"
            rasterUrl={null}
            rasterUrls={[]}
            windField={null}
            windMode="particles"
          />
        </ThemeProvider>
      </LanguageProvider>,
    );

  return { onStyleReload, rerender };
};

beforeEach(() => {
  onceListeners.length = 0;
  Object.values(mapMethods).forEach((method) => { method.mockClear(); });
});

describe("MapLibreViewport basemap switching", () => {
  it("does not touch the style on mount", async () => {
    await renderViewport(configuration.styleUrl);
    expect(mapMethods.setStyle).not.toHaveBeenCalled();
  });

  it("swaps the style even when the current one carries no name", async () => {
    // Most styles, including OpenFreeMap's, omit the optional `name` field.
    mapMethods.getStyle.mockReturnValue({ layers: [], sources: {} });

    const { rerender } = await renderViewport(configuration.styleUrl);
    rerender("https://tiles.example.test/dark");

    expect(mapMethods.setStyle).toHaveBeenCalledWith("https://tiles.example.test/dark");
  });

  it("announces the reload only once the new style is installed", async () => {
    const { onStyleReload, rerender } = await renderViewport(configuration.styleUrl);
    rerender("https://tiles.example.test/dark");

    expect(onStyleReload).not.toHaveBeenCalled();

    // `idle` can fire while the replacement style is still loading; anything
    // re-added at that point is discarded by the incoming style.
    fire("idle");
    expect(onStyleReload).not.toHaveBeenCalled();

    fire("style.load");
    expect(onStyleReload).toHaveBeenCalledTimes(1);
  });

  it("ignores a re-render that does not change the basemap", async () => {
    const { rerender } = await renderViewport(configuration.styleUrl);
    rerender(configuration.styleUrl);

    expect(mapMethods.setStyle).not.toHaveBeenCalled();
  });
});
