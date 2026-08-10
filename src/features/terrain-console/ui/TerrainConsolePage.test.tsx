import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerrainConsolePage } from "./TerrainConsolePage";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    session: {
      user: {
        displayName: "Operador Neural",
        email: "operator@neuralterrena.com",
        id: "user-1",
        roles: ["analyst"],
      },
      expiresAt: new Date("2026-06-25T18:00:00Z"),
    },
  }),
  useLogout: () => vi.fn(),
}));

vi.mock("@/shared/providers", () => ({
  useLanguage: () => ({
    language: "es",
    setLanguage: vi.fn(),
  }),
  useTheme: () => ({
    resolvedTheme: "light",
    themePreference: "light",
    setThemePreference: vi.fn(),
  }),
}));

vi.mock("./OpenGlobusViewport", () => ({
  OpenGlobusViewport: () => <div data-testid="openglobus-viewport" />,
}));

vi.mock("../model/useTerrainConsole", () => ({
  useTerrainConsole: () => ({
    activeTab: "sun",
    activeTool: "nav",
    basemap: "topo",
    cursorPoint: { lat: 43.17, lng: -4.85 },
    engineState: {
      status: "idle",
      message: "Listo",
      progress: 0,
      loadedTileCount: 4,
    },
    fontScaleLarge: false,
    isPlaying: false,
    losPendingPoint: null,
    losState: null,
    mcooOpacity: 0.5,
    mcooOverlay: null,
    mcooVisible: false,
    metrics: {
      activeLayers: 1,
      timeWindow: "12 h",
      criticalAlerts: 0,
      traceableOutputs: 8,
    },
    moonState: {
      altitude: 10,
      azimuth: 120,
      distanceKm: 384000,
      illuminationFraction: 0.42,
      phaseValue: 0.3,
      phaseName: "Creciente",
      moonrise: null,
      moonset: null,
      nvgSummary: "NVG efectivo con apoyo lunar.",
    },
    nightOpacity: 0.2,
    observerHeight: 2,
    operationAssessments: [],
    pointAnalysis: null,
    selectedDate: new Date("2026-06-25T12:00:00Z"),
    simulationDate: new Date("2026-06-25T12:00:00Z"),
    solarState: {
      altitude: 40,
      azimuth: 150,
      direction: "SE",
      phase: "day",
      times: {
        sunrise: new Date("2026-06-25T05:00:00Z"),
        sunset: new Date("2026-06-25T20:00:00Z"),
        civilDawn: new Date("2026-06-25T04:30:00Z"),
        civilDusk: new Date("2026-06-25T20:30:00Z"),
        nauticalDawn: new Date("2026-06-25T04:00:00Z"),
        nauticalDusk: new Date("2026-06-25T21:00:00Z"),
      },
      daylightLabel: "15h 0m",
    },
    speedMultiplier: 1,
    terrainExaggeration: 1.5,
    timeMinutes: 720,
    toolStatusMessage: "",
    viewState: {
      center: { lat: 43.17, lng: -4.85 },
      pseudoZoom: 11,
      bounds: { west: -5.35, east: -4.35, south: 42.77, north: 43.57 },
    },
    viewshedLiveMode: false,
    viewshedOpacity: 0.65,
    viewshedRadiusKm: 5,
    viewshedState: null,
    weatherState: {
      temperatureC: 23,
      humidity: 50,
      dewPointC: 12,
      pressureHpa: 1015,
      windKph: 10,
      gustKph: 14,
      windDirection: "NE",
      windDegrees: 45,
      sky: "☀ Despejado",
      cloudCover: 10,
      visibilityKm: 10,
      precipitation: "Ninguna",
      fogLevel: "none",
      fogLabel: "NULO",
    },
    setActiveTab: vi.fn(),
    setActiveTool: vi.fn(),
    setBasemap: vi.fn(),
    setIsPlaying: vi.fn(),
    setMcooOpacity: vi.fn(),
    setObserverHeight: vi.fn(),
    setSelectedDate: vi.fn(),
    setSpeedMultiplier: vi.fn(),
    setTerrainExaggeration: vi.fn(),
    setTimeMinutes: vi.fn(),
    setViewshedLiveMode: vi.fn(),
    setViewshedOpacity: vi.fn(),
    setViewshedRadiusKm: vi.fn(),
    clearOperationalState: vi.fn(),
    formatMetricDate: (date: Date | null) => (date ? "05:00" : "--:--"),
    minutesToClock: () => "12:00",
    onMapClick: vi.fn(),
    onMapMove: vi.fn(),
    setViewState: vi.fn(),
    toggleMcoo: vi.fn(),
  }),
}));

describe("TerrainConsolePage", () => {
  it("renders the operational map shell", () => {
    render(<TerrainConsolePage />);

    expect(screen.getByTestId("openglobus-viewport")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Topográfico" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Motor y configuración")).toBeInTheDocument();
  });
});
