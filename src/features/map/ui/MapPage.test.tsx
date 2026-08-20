import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const viewport = vi.fn(({ rasterUrl }: { rasterUrl: string | null }) => <div data-raster-url={rasterUrl ?? ""} data-testid="map-viewport" />);
vi.mock("./MapLibreViewport", () => ({ MapLibreViewport: viewport }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); viewport.mockClear(); });

describe("MapPage model and timeline", () => {
  it("switches model, updates the timeline and preserves the mounted map viewport", async () => {
    vi.stubEnv("VITE_FORECAST_HUB_API_BASE_URL", "https://forecast.example.test");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = input instanceof Request ? input.url : new URL(input).toString();
      if (url.includes("/v1/models") && !url.includes("/runs") && !url.includes("/zarr")) return Promise.resolve(new Response(JSON.stringify({ models: ["gfs", "icon-eu"] })));
      if (url.includes("/runs")) return Promise.resolve(new Response(JSON.stringify({ runs: { "2026081500": { created_at: "2026-08-15T00:00:00Z", forecast_hours: [0, 3], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"], "3": ["temperature_2m"] } } } })));
      if (url.includes("/zarr/")) return Promise.resolve(new Response(JSON.stringify({ format: "zarr", dimensions: [], forecast_hours: [0, 3], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"], "3": ["temperature_2m"] }, bounds: [-9.5, 3.5, 35.5, 44.5], download: "" })));
      return Promise.resolve(new Response("", { status: 404 }));
    });
    const { MapPage } = await import("./MapPage");
    render(<MapPage />);
    await screen.findByRole("button", { name: "Temperatura a 2 m" });
    const slider = screen.getByLabelText("Hora de predicción");
    fireEvent.change(slider, { target: { value: "1" } });
    await waitFor(() => expect(screen.getByText("+3 h")).toBeInTheDocument());
    const mapViewport = screen.getByTestId("map-viewport");
    fireEvent.change(screen.getByLabelText("Modelo meteorológico"), { target: { value: "icon-eu" } });
    await waitFor(() => expect(screen.getByText("Datos: DWD ICON-EU")).toBeInTheDocument());
    expect(screen.getByTestId("map-viewport")).toBe(mapViewport);
    expect(screen.getByTestId("map-viewport")).toBeInTheDocument();
  });
});
