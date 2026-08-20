import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/providers/LanguageProvider";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";

const viewport = vi.fn(({ forecastPanelAriaLabel, forecastPanelOpen, onForecastPanelToggle, rasterUrl }: { forecastPanelAriaLabel: string; forecastPanelOpen: boolean; onForecastPanelToggle: () => void; rasterUrl: string | null }) => <div data-raster-url={rasterUrl ?? ""} data-testid="map-viewport"><button aria-expanded={forecastPanelOpen} aria-label={forecastPanelAriaLabel} onClick={onForecastPanelToggle} type="button" /></div>);
vi.mock("./MapLibreViewport", () => ({ MapLibreViewport: viewport }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); viewport.mockClear(); });

describe("MapPage model and timeline", () => {
  it("toggles the forecast panel while preserving its selection and the mounted map viewport", async () => {
    vi.stubEnv("VITE_FORECAST_HUB_API_BASE_URL", "https://forecast.example.test");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = input instanceof Request ? input.url : new URL(input).toString();
      if (url.includes("/v1/models") && !url.includes("/runs") && !url.includes("/zarr")) return Promise.resolve(new Response(JSON.stringify({ models: ["gfs", "icon-eu"] })));
      if (url.includes("/runs")) return Promise.resolve(new Response(JSON.stringify({ runs: { "2026081500": { created_at: "2026-08-15T00:00:00Z", forecast_hours: [0, 3], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"], "3": ["temperature_2m"] } } } })));
      if (url.includes("/zarr/")) return Promise.resolve(new Response(JSON.stringify({ format: "zarr", dimensions: [], forecast_hours: [0, 3], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"], "3": ["temperature_2m"] }, bounds: [-9.5, 3.5, 35.5, 44.5], download: "" })));
      return Promise.resolve(new Response("", { status: 404 }));
    });
    const { MapPage } = await import("./MapPage");
    render(<LanguageProvider><LanguageSwitcher /><MapPage /></LanguageProvider>);
    const panelToggle = await screen.findByRole("button", { name: /Abrir controles de predicción/ });
    expect(panelToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Predicción meteorológica" })).not.toBeInTheDocument();
    fireEvent.click(panelToggle);
    await waitFor(() => expect(screen.getByLabelText("Capa meteorológica")).toHaveValue("temperature_2m"));
    const slider = screen.getByLabelText("Plazo");
    fireEvent.change(slider, { target: { value: "1" } });
    await waitFor(() => expect(screen.getByText("+3 h")).toBeInTheDocument());
    const mapViewport = screen.getByTestId("map-viewport");
    fireEvent.change(screen.getByLabelText("Modelo"), { target: { value: "icon-eu" } });
    await waitFor(() => expect(screen.getByText("Datos: DWD ICON-EU")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Cerrar controles de predicción" }));
    expect(screen.queryByLabelText("Modelo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abrir controles de predicción/ })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: /Abrir controles de predicción/ }));
    expect(screen.getByLabelText("Modelo")).toHaveValue("icon-eu");
    expect(screen.getByTestId("map-viewport")).toBe(mapViewport);
    expect(screen.getByTestId("map-viewport")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inglés" }));
    expect(within(mapViewport).getByRole("button", { name: /Close forecast controls/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("icon-eu");
  });
});
