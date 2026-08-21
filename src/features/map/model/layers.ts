import type { ForecastLayer, RasterRange, RunInfo } from "../api/forecastMapApi";
import type { TranslationKey } from "@/shared/i18n";

export interface ForecastLayerDefinition {
  advanced?: boolean;
  id: ForecastLayer;
  labelKey: TranslationKey;
  palette: string;
  unit: string;
  visualizationGroup?: "temperature";
  defaultRange: RasterRange;
  descriptionKey?: TranslationKey;
  convert?: (value: number) => number;
}

// Shared across all temperature levels so the same colour always means the
// same temperature. Kept deliberately broad for Iberian GFS forecasts.
export const TEMPERATURE_RANGE: RasterRange = { min: 223.15, max: 323.15 };

export const forecastLayerDefinitions: readonly ForecastLayerDefinition[] = [
  { id: "temperature_2m", labelKey: "map.layer.temperature2m", unit: "°C", palette: "coolwarm", defaultRange: TEMPERATURE_RANGE, visualizationGroup: "temperature", convert: (value) => value - 273.15 },
  { id: "mean_sea_level_pressure", labelKey: "map.layer.meanSeaLevelPressure", unit: "hPa", palette: "viridis", defaultRange: { min: 96000, max: 104000 }, convert: (value) => value / 100 },
  { id: "precipitation_accumulated", labelKey: "map.layer.precipitationAccumulated", unit: "mm", palette: "blues", defaultRange: { min: 0, max: 80 }, descriptionKey: "map.precipitationDescription" },
  { id: "thermal_inversion_strength", labelKey: "map.layer.thermalInversion", unit: "K", palette: "viridis", defaultRange: { min: 0, max: 20 }, advanced: true, descriptionKey: "map.thermalInversionDescription" },
  { id: "temperature_1000hpa", labelKey: "map.layer.temperature1000hpa", unit: "°C", palette: "coolwarm", defaultRange: TEMPERATURE_RANGE, visualizationGroup: "temperature", advanced: true, convert: (value) => value - 273.15 },
  { id: "temperature_925hpa", labelKey: "map.layer.temperature925hpa", unit: "°C", palette: "coolwarm", defaultRange: TEMPERATURE_RANGE, visualizationGroup: "temperature", advanced: true, convert: (value) => value - 273.15 },
  { id: "temperature_850hpa", labelKey: "map.layer.temperature850hpa", unit: "°C", palette: "coolwarm", defaultRange: TEMPERATURE_RANGE, visualizationGroup: "temperature", advanced: true, convert: (value) => value - 273.15 },
  { id: "wind_u_10m", labelKey: "map.layer.windU10m", unit: "m/s", palette: "viridis", defaultRange: { min: -30, max: 30 }, advanced: true },
  { id: "wind_v_10m", labelKey: "map.layer.windV10m", unit: "m/s", palette: "viridis", defaultRange: { min: -30, max: 30 }, advanced: true },
];

export const layerById = new Map(forecastLayerDefinitions.map((layer) => [layer.id, layer]));

export function availableLayers(info: RunInfo | null, hour: number | null) {
  if (!info || hour === null) return [];
  return info.forecast_layers[String(hour)] ?? [];
}

export function selectLayer(info: RunInfo | null, hour: number | null): ForecastLayer | null {
  const layers = availableLayers(info, hour);
  return layers.includes("temperature_2m") ? "temperature_2m" : (layers[0] ?? null);
}

export function forecastValidDate(run: string, hour: number) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(run);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]) + hour));
}

export const OROGRAPHY_LAYER_ID = "orography-hillshade";
export const OROGRAPHY_SOURCE_ID = "orography-dem";
