import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import babel from "@rolldown/plugin-babel";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

function syncOpenGlobusResources() {
  const sourceDir = fileURLToPath(new URL("./node_modules/@openglobus/og/lib/res", import.meta.url));
  const targetDir = fileURLToPath(new URL("./public/res", import.meta.url));

  if (!existsSync(sourceDir)) {
    return;
  }

  mkdirSync(path.dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { force: true, recursive: true });
}

function openGlobusResourcesPlugin() {
  return {
    buildStart() {
      syncOpenGlobusResources();
    },
    configureServer() {
      syncOpenGlobusResources();
    },
    name: "sync-openglobus-resources",
  };
}

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    openGlobusResourcesPlugin(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
});
