import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A stand-in for the MapLibre instance: the control layer only needs a camera
 * to read and event hooks to subscribe to, so the real GL map (which jsdom
 * cannot run) is not required to exercise the page.
 */
function createFakeMap() {
  return {
    flyTo: vi.fn(),
    getBearing: () => 0,
    getCanvas: () => document.createElement("canvas"),
    getCenter: () => ({ lat: 43.17, lng: -4.85 }),
    getContainer: () => document.createElement("div"),
    getLayer: () => undefined,
    getPitch: () => 0,
    getSource: () => undefined,
    getZoom: () => 10,
    isStyleLoaded: () => true,
    off: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    resetNorthPitch: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };
}

const fakeMap = createFakeMap();

const viewport = vi.fn(({ children, onMapReady, rasterUrl }: PropsWithChildren<{ onMapReady: (map: unknown) => void; rasterUrl: string | null }>) => {
  useEffect(() => {
    onMapReady(fakeMap);
    return () => onMapReady(null);
  }, [onMapReady]);

  return <div data-raster-url={rasterUrl ?? ""} data-testid="map-viewport">{children}</div>;
});
vi.mock("./MapLibreViewport", () => ({ MapLibreViewport: viewport }));

/**
 * MapPage reads its configuration once, at module scope, so a test that needs
 * a different environment has to re-import it. Every module in the tree is
 * therefore imported here rather than at the top of the file: a static import
 * would survive `vi.resetModules()` and hand the providers a different copy of
 * the React context than the one the freshly imported page consumes.
 */
const renderPage = async () => {
  const [{ MapPage }, { LanguageProvider, ThemeProvider }, { LanguageSwitcher }] = await Promise.all([
    import("./MapPage"),
    import("@/shared/providers"),
    import("@/shared/ui/LanguageSwitcher"),
  ]);

  return render(
    <LanguageProvider>
      <ThemeProvider>
        <LanguageSwitcher />
        <MapPage />
      </ThemeProvider>
    </LanguageProvider>,
  );
};

const stubForecastHub = () => {
  vi.stubEnv("VITE_FORECAST_HUB_API_BASE_URL", "https://forecast.example.test");
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = input instanceof Request ? input.url : new URL(input).toString();
    if (url.includes("/v1/models") && !url.includes("/runs") && !url.includes("/zarr")) return Promise.resolve(new Response(JSON.stringify({ models: ["gfs", "icon-eu"] })));
    if (url.includes("/runs")) return Promise.resolve(new Response(JSON.stringify({ runs: { "2026081500": { created_at: "2026-08-15T00:00:00Z", forecast_hours: [0, 3], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"], "3": ["temperature_2m"] } } } })));
    if (url.includes("/zarr/")) return Promise.resolve(new Response(JSON.stringify({ format: "zarr", dimensions: [], forecast_hours: [0, 3], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"], "3": ["temperature_2m"] }, bounds: [-9.5, 3.5, 35.5, 44.5], download: "" })));
    return Promise.resolve(new Response("", { status: 404 }));
  });
};

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); viewport.mockClear(); });

describe("MapPage model and timeline", () => {
  it("toggles the forecast panel while preserving its selection and the mounted map viewport", async () => {
    stubForecastHub();
    await renderPage();

    const panelToggle = await screen.findByRole("button", { name: /Capas y predicción/ });
    expect(screen.queryByLabelText("Capa meteorológica")).not.toBeInTheDocument();

    fireEvent.click(panelToggle);
    await waitFor(() => expect(screen.getByLabelText("Capa meteorológica")).toHaveValue("temperature_2m"));

    fireEvent.change(screen.getByLabelText("Plazo"), { target: { value: "1" } });
    await waitFor(() => expect(screen.getByText("+3 h")).toBeInTheDocument());

    const mapViewport = screen.getByTestId("map-viewport");
    fireEvent.change(screen.getByLabelText("Modelo"), { target: { value: "icon-eu" } });
    await waitFor(() => expect(screen.getByText("Datos: DWD ICON-EU")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Cerrar panel" }));
    expect(screen.queryByLabelText("Modelo")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Capas y predicción/ }));
    expect(screen.getByLabelText("Modelo")).toHaveValue("icon-eu");
    expect(screen.getByTestId("map-viewport")).toBe(mapViewport);

    fireEvent.click(screen.getByRole("button", { name: "Inglés" }));
    expect(within(mapViewport).getByRole("button", { name: /Layers and forecast/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("icon-eu");
  });
});

describe("MapPage control layer", () => {
  it("drives the map camera from the canon zoom and bearing cluster", async () => {
    stubForecastHub();
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Acercar" }));
    expect(fakeMap.zoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Alejar" }));
    expect(fakeMap.zoomOut).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Orientar al norte" }));
    expect(fakeMap.resetNorthPitch).toHaveBeenCalled();
  });

  it("reports the live scale and centre readout", async () => {
    stubForecastHub();
    await renderPage();

    // 43.17 N at zoom 10 is ~55.7 m/px, so the largest nice step inside 120px is 5 km.
    expect(await screen.findByText(/^5\s*km$/)).toBeInTheDocument();
    expect(screen.getByText("43.1700 N · 4.8500 W")).toBeInTheDocument();
  });

  it("flies to a coordinate typed into the search field and refuses a place name", async () => {
    stubForecastHub();
    await renderPage();

    const search = await screen.findByLabelText("Buscar en el mapa");
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "León" } });
    expect(screen.getByText("La búsqueda por lugar no está disponible.")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "43.36, -5.85" } });
    fireEvent.click(screen.getByRole("button", { name: /Ir a las coordenadas/ }));
    expect(fakeMap.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-5.85, 43.36] }));
  });

  it("hides the basemap switcher while only one style is configured", async () => {
    stubForecastHub();
    await renderPage();

    await screen.findByRole("button", { name: "Medir" });
    expect(screen.queryByRole("button", { name: "Mapa base" })).not.toBeInTheDocument();
  });

  it("offers the basemap switcher once a second style is configured", async () => {
    vi.stubEnv("VITE_MAP_STYLE_TERRAIN_URL", "https://maps.example.test/terrain.json");
    stubForecastHub();
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Mapa base" }));
    expect(screen.getByRole("radio", { name: "Topográfico" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Relieve" })).toBeInTheDocument();
  });

  it("keeps the measure readout stable before enough points are placed", async () => {
    stubForecastHub();
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Medir" }));
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Rumbo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Deshacer/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^Área$/ }));
    expect(screen.getByText("Perímetro")).toBeInTheDocument();
  });
});
