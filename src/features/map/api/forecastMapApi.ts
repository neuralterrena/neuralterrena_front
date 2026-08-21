import { apiClient } from "../../auth/api/apiClient";

export type KnownForecastModel = "gfs" | "icon-eu";
export type ForecastModelId = KnownForecastModel | (string & {});
export type ForecastLayer =
  | "temperature_2m"
  | "temperature_1000hpa"
  | "temperature_925hpa"
  | "temperature_850hpa"
  | "thermal_inversion_strength"
  | "mean_sea_level_pressure"
  | "precipitation_accumulated"
  | "wind_u_10m"
  | "wind_v_10m";

export interface ForecastModel {
  id: ForecastModelId;
  label?: string;
}

export interface RunInfo {
  created_at: string;
  forecast_hours: number[];
  layers: ForecastLayer[];
  forecast_layers: Record<string, ForecastLayer[]>;
}

export interface ZarrMetadata extends RunInfo {
  bounds: [west: number, east: number, south: number, north: number];
  dimensions: string[];
  download: string;
  format: string;
}

export interface WindField {
  latitudes: number[];
  longitudes: number[];
  u: number[][];
  v: number[][];
}

export interface RasterRange {
  min: number;
  max: number;
}

const endpoint = (baseUrl: string, path: string) => new URL(path, `${baseUrl}/`).toString();
const modelPath = (model: ForecastModelId) => encodeURIComponent(model);

function normalizeRunInfo(value: Omit<RunInfo, "forecast_layers"> & { forecast_layers?: Record<string, string[]> }): RunInfo {
  return {
    ...value,
    forecast_hours: [...value.forecast_hours].sort((a, b) => a - b),
    forecast_layers: Object.fromEntries(
      Object.entries(value.forecast_layers ?? {}).map(([hour, layers]) => [hour, layers as ForecastLayer[]]),
    ),
    layers: value.layers,
  };
}

async function json<T>(url: string, baseUrl: string, signal?: AbortSignal): Promise<T> {
  const response = await apiClient.get(url, { authBaseUrl: baseUrl, signal });
  if (!response.ok) throw new ForecastHubError(response.status);
  return response.json() as Promise<T>;
}

export class ForecastHubError extends Error {
  constructor(public readonly status?: number) {
    super(status === 401
      ? "Tu sesión ha caducado. Vuelve a iniciar sesión."
      : status === 404
        ? "El modelo, ciclo, capa o plazo solicitado no está disponible."
        : "No se pudo conectar con Forecast Hub.");
  }
}

function normalizeModels(payload: { models?: unknown } | unknown[]): ForecastModel[] {
  const models = Array.isArray(payload) ? payload : payload.models;
  if (Array.isArray(models)) {
    return models.map((model) => typeof model === "string" ? { id: model } : model as ForecastModel)
      .filter((model) => typeof model.id === "string");
  }
  if (models && typeof models === "object") {
    return Object.entries(models as Record<string, unknown>).map(([id, value]) => ({
      id,
      ...(value && typeof value === "object" ? value as Omit<ForecastModel, "id"> : {}),
    }));
  }
  return [];
}

export async function getModels(baseUrl: string, signal?: AbortSignal) {
  const payload = await json<{ models?: unknown } | unknown[]>(endpoint(baseUrl, "v1/models"), baseUrl, signal);
  return normalizeModels(payload).sort((a, b) => a.id.localeCompare(b.id));
}

export async function getRuns(baseUrl: string, model: ForecastModelId, signal?: AbortSignal) {
  const result = await json<{ runs: Record<string, Omit<RunInfo, "forecast_layers"> & { forecast_layers?: Record<string, string[]> }> }>(endpoint(baseUrl, `v1/models/${modelPath(model)}/runs`), baseUrl, signal);
  return Object.entries(result.runs)
    .map(([run, info]) => [run, normalizeRunInfo(info)] as [string, RunInfo])
    .sort(([a], [b]) => b.localeCompare(a));
}

export async function getRunMetadata(baseUrl: string, model: ForecastModelId, run: string, signal?: AbortSignal) {
  const metadata = await json<Omit<ZarrMetadata, "forecast_layers"> & { forecast_layers?: Record<string, string[]> }>(endpoint(baseUrl, `v1/models/${modelPath(model)}/zarr/${encodeURIComponent(run)}`), baseUrl, signal);
  return normalizeRunInfo(metadata) as ZarrMetadata;
}

export async function getWindField(baseUrl: string, model: ForecastModelId, run: string, hour: number, signal?: AbortSignal) {
  return json<WindField>(endpoint(baseUrl, `v1/models/${modelPath(model)}/map-wind/${encodeURIComponent(run)}/${hour}.json`), baseUrl, signal);
}

export function buildRasterTileUrl(baseUrl: string, model: ForecastModelId, run: string, variable: ForecastLayer, hour: number, range: RasterRange, palette: string) {
  const url = new URL(`v1/models/${modelPath(model)}/zarr/tiles/WebMercatorQuad/{z}/{x}/{y}.png`, `${baseUrl}/`);
  url.searchParams.set("run", run);
  url.searchParams.set("variable", variable);
  url.searchParams.set("sel", `forecast_hour=${hour}`);
  url.searchParams.set("rescale", `${range.min},${range.max}`);
  url.searchParams.set("colormap_name", palette);
  return url.toString().replace(/%7B(z|x|y)%7D/gi, "{$1}");
}
