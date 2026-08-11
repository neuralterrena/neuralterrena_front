export type MapProjection = "mercator" | "globe";

export interface MapView {
  center: [longitude: number, latitude: number];
  zoom: number;
}

export interface MapConfiguration {
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

export function readMapConfiguration(
  env: Pick<
    ImportMetaEnv,
    "VITE_MAP_INITIAL_CENTER" | "VITE_MAP_INITIAL_ZOOM" | "VITE_MAP_STYLE_URL"
  > = import.meta.env,
): MapConfiguration {
  const styleUrl = env.VITE_MAP_STYLE_URL?.trim() || DEFAULT_MAP_STYLE_URL;

  return {
    initialView: {
      center: parseCenter(env.VITE_MAP_INITIAL_CENTER),
      zoom: parseZoom(env.VITE_MAP_INITIAL_ZOOM),
    },
    styleUrl,
  };
}
