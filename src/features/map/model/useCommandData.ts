import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getModels,
  getPointSeries,
  getRunMetadata,
  getRuns,
  type ForecastLayer,
  type ForecastModel,
  type ForecastModelId,
  type RunInfo,
} from "../api/forecastMapApi";
import { COMMAND_LANES, type LaneSample } from "./commandLanes";
import type { LngLat } from "./geodesy";

/**
 * Forecast loading for the command view.
 *
 * This deliberately does not reuse MapPage's effects: that page drives raster
 * tiles and a wind field, this one drives point series, and folding both into
 * one hook would mean reshaping working code on the map page. The shared
 * model/run/metadata chain is a good candidate to extract once this settles.
 */

export interface CommandRunState {
  error: string | null;
  isLoading: boolean;
  metadata: RunInfo | null;
  model: ForecastModelId | null;
  models: ForecastModel[];
  reload: () => void;
  run: string;
  runs: [string, RunInfo][];
  setModel: (model: ForecastModelId) => void;
  setRun: (run: string) => void;
}

const toMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useCommandRun(baseUrl: string, fallbackMessage: string): CommandRunState {
  const [models, setModels] = useState<ForecastModel[]>([]);
  const [model, setModel] = useState<ForecastModelId | null>(null);
  const [runs, setRuns] = useState<[string, RunInfo][]>([]);
  const [run, setRun] = useState("");
  const [metadata, setMetadata] = useState<RunInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!baseUrl) return undefined;
    const controller = new AbortController();

    void Promise.resolve()
      .then(() => {
        setIsLoading(true);
        setError(null);
        return getModels(baseUrl, controller.signal);
      })
      .then((next) => {
        if (controller.signal.aborted) return;
        setModels(next);
        setModel((current) => current ?? next[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(toMessage(cause, fallbackMessage));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [attempt, baseUrl, fallbackMessage]);

  useEffect(() => {
    if (!baseUrl || !model) return undefined;
    const controller = new AbortController();

    void Promise.resolve()
      .then(() => {
        setIsLoading(true);
        setRuns([]);
        setRun("");
        setMetadata(null);
        return getRuns(baseUrl, model, controller.signal);
      })
      .then((next) => {
        if (controller.signal.aborted) return;
        setRuns(next);
        setRun(next[0]?.[0] ?? "");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(toMessage(cause, fallbackMessage));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [baseUrl, fallbackMessage, model]);

  useEffect(() => {
    if (!baseUrl || !model || !run) return undefined;
    const controller = new AbortController();

    void Promise.resolve()
      .then(() => {
        setIsLoading(true);
        return getRunMetadata(baseUrl, model, run, controller.signal);
      })
      .then((next) => {
        if (!controller.signal.aborted) setMetadata(next);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(toMessage(cause, fallbackMessage));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [baseUrl, fallbackMessage, model, run]);

  return { error, isLoading, metadata, model, models, reload, run, runs, setModel, setRun };
}

export interface LaneSeries {
  laneId: string;
  samples: LaneSample[];
}

export interface CommandSeriesState {
  error: string | null;
  isLoading: boolean;
  series: LaneSeries[];
}

const layerAvailable = (metadata: RunInfo, hour: number, variable: ForecastLayer) =>
  (metadata.forecast_layers[String(hour)] ?? []).includes(variable);

/**
 * Point series for every lane at the cursor location.
 *
 * Provenance is `fct` throughout: the Hub serves model output only. The moment
 * a station feed exists, samples it covers flip to `obs` and the timeline
 * renders them solid with no change here beyond the source of the value.
 */
export function useCommandSeries(
  baseUrl: string,
  model: ForecastModelId | null,
  run: string,
  metadata: RunInfo | null,
  point: LngLat,
  fallbackMessage: string,
): CommandSeriesState {
  const [series, setSeries] = useState<LaneSeries[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetching on every pixel of map drag would hammer the Hub; the series is
  // tied to where the operator stopped, rounded to the grid it is sampled on.
  const key = `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`;

  const ready = Boolean(baseUrl && model && run && metadata);

  useEffect(() => {
    if (!ready || !model || !run || !metadata) {
      return undefined;
    }

    const [lat, lng] = key.split(",").map(Number);
    const controller = new AbortController();
    const hours = metadata.forecast_hours;

    // Deferred out of the synchronous effect body, like the rest of the
    // feature's loaders, so the fetch does not cascade a render.
    void Promise.resolve()
      .then(() => {
        setIsLoading(true);
        setError(null);
        return Promise.all(
          COMMAND_LANES.map(async (lane) => {
            const columns = await Promise.all(
              lane.variables.map((variable) =>
                getPointSeries(baseUrl, model, run, variable, { lat, lng }, hours, controller.signal),
              ),
            );

            const samples: LaneSample[] = hours.map((hour, index) => {
              const missing = lane.variables.some(
                (variable) => !layerAvailable(metadata, hour, variable),
              );
              const value = missing
                ? null
                : lane.combine(columns.map((column) => column.values[index]));
              return { hour, provenance: "fct", value };
            });

            return { laneId: lane.id, samples };
          }),
        );
      })
      .then((next) => {
        if (!controller.signal.aborted) setSeries(next);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setSeries([]);
          setError(toMessage(cause, fallbackMessage));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [baseUrl, fallbackMessage, key, metadata, model, ready, run]);

  // Derived rather than cleared from the effect: an unready input is not an
  // event to react to, it is simply nothing to show.
  return useMemo(
    () => ({ error, isLoading: ready && isLoading, series: ready ? series : [] }),
    [error, isLoading, ready, series],
  );
}
