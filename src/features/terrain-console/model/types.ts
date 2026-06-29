export type BasemapMode = "topo" | "gray";

export type ActiveTool = "nav" | "viewshed" | "los" | "info";

export type TerrainTab = "sun" | "moon" | "weather" | "ops";

export type SpeedMultiplier = 1 | 4 | 10;

export type SolarPhase = "day" | "civil" | "nautical" | "astronomical" | "night";

export type EngineStatus = "idle" | "computing";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface EngineState {
  status: EngineStatus;
  message: string;
  progress: number;
  loadedTileCount: number;
}

export interface OverlayImageState {
  corners: [number, number][];
  imageUrl: string;
  opacity: number;
}

export interface ViewshedState extends OverlayImageState {
  point: GeoPoint;
  percentVisible: number;
  durationSeconds: number;
  radiusKm: number;
  observerHeight: number;
  live: boolean;
}

export interface LosState {
  blocked: boolean;
  distanceKm: number;
  elevationDelta: number;
  profile: { distance: number; elevation: number }[];
  start: GeoPoint;
  end: GeoPoint;
}

export interface PointAnalysisResult {
  point: GeoPoint;
  elevation: number;
  slopePercent: number;
  aspectDegrees: number;
  aspectLabel: string;
  mobilityLabel: string;
  mobilityClass: "unr" | "res" | "sev";
  coverLabel: string;
  coverClass: "good" | "fair" | "poor";
  isDominantTerrain: boolean;
  isValleyFloor: boolean;
}

export interface SolarTimes {
  sunrise: Date | null;
  sunset: Date | null;
  civilDawn: Date | null;
  civilDusk: Date | null;
  nauticalDawn: Date | null;
  nauticalDusk: Date | null;
}

export interface SolarState {
  altitude: number;
  azimuth: number;
  direction: string;
  phase: SolarPhase;
  times: SolarTimes;
  daylightLabel: string;
}

export interface MoonState {
  altitude: number;
  azimuth: number;
  distanceKm: number;
  illuminationFraction: number;
  phaseValue: number;
  phaseName: string;
  moonrise: Date | null;
  moonset: Date | null;
  nvgSummary: string;
}

export interface WeatherState {
  temperatureC: number;
  humidity: number;
  dewPointC: number;
  pressureHpa: number;
  windKph: number;
  gustKph: number;
  windDirection: string;
  windDegrees: number;
  sky: string;
  cloudCover: number;
  visibilityKm: number;
  precipitation: string;
  fogLevel: "high" | "low" | "none";
  fogLabel: string;
}

export interface OperationAssessment {
  name: string;
  status: "fav" | "mar" | "unf";
}

export interface OperationalMetrics {
  activeLayers: number;
  timeWindow: string;
  criticalAlerts: number;
  traceableOutputs: number;
}

