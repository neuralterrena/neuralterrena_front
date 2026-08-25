import type { TranslationKey } from "@/shared/i18n";

export type MapProjection = "mercator" | "globe";

export type BasemapId = "topographic" | "terrain" | "satellite" | "dark";

export interface MapView {
  center: [longitude: number, latitude: number];
  zoom: number;
}

/**
 * A basemap option for the switcher. `swatch` is the thumbnail fill used in
 * the picker: the canon wants a preview, and a CSS gradient is honest about
 * being a stand-in where a real tile thumbnail is not available.
 */
export interface MapBasemap {
  id: BasemapId;
  labelKey: TranslationKey;
  styleUrl: string;
  swatch: string;
}

export interface MapConfiguration {
  basemaps: MapBasemap[];
  forecastHubApiBaseUrl: string;
  initialView: MapView;
  styleUrl: string;
}

const DEFAULT_VIEW: MapView = {
  center: [-4.85, 43.17],
  zoom: 10,
};

export const DEFAULT_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

function parseCenter(value: string | undefined): MapView["center"] {
  if (!value) {
    return DEFAULT_VIEW.center;
  }

  const [longitude, latitude] = value.split(",").map(Number);
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return DEFAULT_VIEW.center;
  }

  return [longitude, latitude];
}

function parseZoom(value: string | undefined) {
  const zoom = Number(value);
  return Number.isFinite(zoom) && zoom >= 0 && zoom <= 22
    ? zoom
    : DEFAULT_VIEW.zoom;
}

const BASEMAP_SWATCHES: Record<BasemapId, string> = {
  dark: "linear-gradient(160deg, #1a1a1a, #3c3c3b)",
  satellite: "linear-gradient(160deg, #3c3c3b, #1e4f82 60%, #878787)",
  terrain: "linear-gradient(160deg, #dadada, #878787 55%, #3c3c3b)",
  topographic: "linear-gradient(160deg, #f6f6f6, #dadada 55%, #b2b2b2)",
};

const BASEMAP_LABEL_KEYS: Record<BasemapId, TranslationKey> = {
  dark: "map.basemapDark",
  satellite: "map.basemapSatellite",
  terrain: "map.basemapTerrain",
  topographic: "map.basemapTopographic",
};

function basemap(id: BasemapId, styleUrl: string): MapBasemap {
  return { id, labelKey: BASEMAP_LABEL_KEYS[id], styleUrl, swatch: BASEMAP_SWATCHES[id] };
}

/**
 * Basemaps are opt-in per environment: only the ones with a configured style
 * URL are offered. No third-party tile endpoint is hard-coded here beyond the
 * documented OpenFreeMap default, so an unconfigured deployment simply shows
 * a single basemap and the switcher hides itself.
 */
function readBasemaps(
  env: Pick<
    ImportMetaEnv,
    | "VITE_MAP_STYLE_URL"
    | "VITE_MAP_STYLE_TERRAIN_URL"
    | "VITE_MAP_STYLE_SATELLITE_URL"
    | "VITE_MAP_STYLE_DARK_URL"
  >,
  styleUrl: string,
): MapBasemap[] {
  const optional: [BasemapId, string | undefined][] = [
    ["terrain", env.VITE_MAP_STYLE_TERRAIN_URL],
    ["satellite", env.VITE_MAP_STYLE_SATELLITE_URL],
    ["dark", env.VITE_MAP_STYLE_DARK_URL],
  ];

  return [
    basemap("topographic", styleUrl),
    ...optional.flatMap(([id, value]) => {
      const trimmed = value?.trim();
      return trimmed ? [basemap(id, trimmed)] : [];
    }),
  ];
}

export function readMapConfiguration(
  env: Pick<
    ImportMetaEnv,
    "VITE_MAP_INITIAL_CENTER" | "VITE_MAP_INITIAL_ZOOM" | "VITE_MAP_STYLE_URL"
    | "VITE_FORECAST_HUB_API_BASE_URL"
    | "VITE_MAP_STYLE_TERRAIN_URL" | "VITE_MAP_STYLE_SATELLITE_URL" | "VITE_MAP_STYLE_DARK_URL"
  > = import.meta.env,
): MapConfiguration {
  const styleUrl = env.VITE_MAP_STYLE_URL?.trim() || DEFAULT_MAP_STYLE_URL;

  return {
    basemaps: readBasemaps(env, styleUrl),
    forecastHubApiBaseUrl: env.VITE_FORECAST_HUB_API_BASE_URL?.trim().replace(/\/$/, "") || "",
    initialView: {
      center: parseCenter(env.VITE_MAP_INITIAL_CENTER),
      zoom: parseZoom(env.VITE_MAP_INITIAL_ZOOM),
    },
    styleUrl,
  };
}
