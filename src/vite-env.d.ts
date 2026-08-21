/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_LOGIN_PATH?: string;
  readonly VITE_AUTH_REFRESH_PATH?: string;
  readonly VITE_MAP_INITIAL_CENTER?: string;
  readonly VITE_MAP_INITIAL_ZOOM?: string;
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_FORECAST_HUB_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
