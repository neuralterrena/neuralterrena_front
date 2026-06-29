/// <reference types="vite/client" />

declare module "@openglobus/og/styles";

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_LOGIN_PATH?: string;
  readonly VITE_AUTH_MODE?: "mock" | "server";
  readonly VITE_AUTH_REFRESH_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
