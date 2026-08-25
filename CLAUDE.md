# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server on 127.0.0.1:5174
npm run build        # tsc -b (project references) then vite build -> dist/
npm run preview      # serve the production build
npm run lint         # ESLint, type-aware
npm run test         # vitest run
npm run test:watch   # vitest watch
```

Single test file / single case:

```bash
npx vitest run src/features/auth/model/authService.test.ts
npx vitest run -t "refreshes the session"
```

`npm run build` runs the TypeScript project build first, so a type error fails the build even if Vite would bundle fine. Run `lint`, `test` and `build` before closing a change (this is the checklist in `DESIGN.MD`).

## Architecture

Three layers, imports flow downward only (`core` → `features` → `shared`):

- `src/core` — app composition: `RootApp` (BrowserRouter) → `AppProviders` (Language → Theme → Typography → Auth) → `AppRouter`, plus `AuthenticatedAppLayout`.
- `src/features/<feature>/{api,model,ui}/index.ts` — isolated domains (`auth`, `map`). `ui` decides how it looks, `model` how it works, `api` how it talks to external services. Full rules in `docs/FEATURE_CONVENTION.md`.
- `src/shared` — providers (theme/language/typography), i18n, `lib/`, `ui/` primitives. Something only moves here once a **second** real consumer exists.

Import rules that are actually enforced by convention, not tooling: use the `@/` alias from outside a feature, import other features only through `@/features/<feature>` (never a subpath), relative paths inside a feature. `src/features/map` currently violates this by reaching into `../../auth/api/apiClient` and `../../auth/model/authService` — treat that as the accepted exception for HTTP infrastructure, not a precedent.

### Auth and HTTP

`authService` (`src/features/auth/model/authService.ts`) is the only place that talks to the auth endpoints. It is **server-only** — there is no mock/offline mode:

- `accessToken` lives in memory in `authSessionStore` (a tiny subscribe/notify store, not React state). Nothing persists it.
- Refresh uses `credentials: "include"` — the refresh token is an httpOnly cookie owned by the backend. Concurrent refreshes are deduped through a module-level `refreshInFlight` promise.
- The `AuthUser` is decoded from the JWT payload client-side; a malformed token throws `AuthError("auth.invalidJwt")`.
- All endpoint paths come from `VITE_AUTH_*` env vars with Django-style defaults (`/api/auth/token/refresh/` etc.).

Every network call goes through `apiClient` (`src/features/auth/api/apiClient.ts`). It attaches `Authorization: Bearer` only when the URL is under `VITE_API_BASE_URL` **or** under the `authBaseUrl` passed per-request — that second path is how the Forecast Hub (a different origin) gets authenticated. On `401` it refreshes once and replays the request; if the refresh fails it calls `notifyUnauthorized()`. `authNavigation.ts` is a deliberate indirection so the auth layer can trigger a redirect without importing the router — `AppRouter` registers the handler via `registerUnauthorizedHandler`.

Never read `localStorage` or call `fetch` from a component; go through the store/service and `apiClient`.

### Map / Forecast Hub

`src/features/map` renders MapLibre GL over a separate backend (`VITE_FORECAST_HUB_API_BASE_URL`):

- `api/forecastMapApi.ts` wraps `v1/models`, `.../runs`, `.../zarr/<run>` (metadata), `.../map-wind/<run>/<hour>.json`, and **builds** the raster tile URL client-side (`.../zarr/tiles/WebMercatorQuad/{z}/{x}/{y}.png` with `run`, `variable`, `sel=forecast_hour=N`, `rescale`, `colormap_name`). The `{z}/{x}/{y}` placeholders are un-escaped after `URL` serialization — keep that.
- `model/layers.ts` is the layer registry: each forecast variable declares its palette, unit, default range, unit conversion (K→°C, Pa→hPa) and i18n label key. Adding a variable means adding an entry here, not touching UI. Temperature layers deliberately share `TEMPERATURE_RANGE` so a colour means the same thing across levels.
- Which layers exist is per run **and per forecast hour** (`RunInfo.forecast_layers`), so use `availableLayers`/`selectLayer` rather than assuming a layer is present.
- `MapLibreViewport` owns the imperative map instance (double-buffered raster slots for crossfade, orography DEM hillshade, mercator/globe projection) and renders the design system's `.nt-map` shell: canvas, then an overlay that takes the control layer as children. It exposes the map through `onMapReady` and signals `onStyleReload` after a basemap change — **switching style discards every custom source and layer**, so anything drawing on the map re-applies on a bumped `styleEpoch`. `WindParticles` is a canvas overlay driven by the `WindField` JSON.
- The map controls are a port of the design system's Map Controls kit: canon CSS in `src/styles/map-controls.scss`, components in `ui/controls/`, composed by `ui/MapControlLayer.tsx`. The page owns `activePanel` because the measure tool listens for map clicks only while its panel is open. Pure maths (`model/geodesy.ts`, `coordinates.ts`, `measure.ts`, `windVisualization.ts`) is kept out of the components so it can be unit-tested without a map.
- The **command view** (`ui/command/`, route `/command`) is the canon's map-centric ops surface. It renders outside `AuthenticatedAppLayout` because `.cmd` is `position: fixed; inset: 0`. Its timeline draws provenance **per sample** (`obs` / `fct` / `nd`), never by which side of NOW a sample falls on, and spends no colour on it — colour stays with severity. Series come from `/zarr/point/{lon},{lat}`, which returns one band per forecast hour; the Hub has **no station endpoint**, so every sample is `fct` today. Lane thresholds in `model/commandLanes.ts` are provisional placeholders, not doctrine. Rules (`model/commandRules.ts`) are predicates over that series; **severity is derived from lead time**, never chosen, so red is spent only on a window that is already running.
- `useCommandData.ts` duplicates MapPage's model/run/metadata chain on purpose: that page drives raster slots and a wind field, this one drives point series. Extracting the shared chain is a good follow-up, but it means reshaping working code on the map page.
- Basemaps are opt-in per environment (`VITE_MAP_STYLE_{TERRAIN,SATELLITE,DARK}_URL`); only configured ones appear in the switcher. Map search resolves **coordinates only** — there is no geocoder behind it.

### i18n, theming, styling

- All user-facing copy goes through `useLanguage().t(key)` with keys from the flat `translations` map in `src/shared/i18n/translations.ts`. `TranslationKey` is derived from that object, so a missing key is a type error. Default language is `es`; both `en` and `es` must be filled in.
- Styling is global SCSS with CSS custom properties: `src/styles/tokens.scss` (the `--nt-*` design tokens) and `src/styles/global.scss` (semantic classes). No CSS modules, no inline styles except unavoidable dynamic values. `ThemeProvider` writes `data-theme` on `<html>`; dark values are token overrides.
- `DESIGN.MD` is binding for new screens: fixed colour tokens, blue as the only primary action, 8px spacing, 4px radii, no hero/landing patterns, Spanish technical copy.

### Env vars

Add any new `VITE_*` var to **both** `.env.example` and the `ImportMetaEnv` interface in `src/vite-env.d.ts`, and read it through a parsing helper (see `readMapConfiguration`) rather than touching `import.meta.env` in a component.

## Conventions

- TypeScript `strict`, ESLint is `recommendedTypeChecked` — new source must live under `src/` or it falls outside `tsconfig.app.json` and lint will error.
- 2-space indent, semicolons, double quotes. Components `PascalCase.tsx`, services `<feature>Service.ts`, hooks `useX.ts`.
- Tests sit beside the code (`*.test.ts` / `*.test.tsx`), jsdom + Testing Library, globals enabled, setup in `src/test/setup.ts`.
- Commits use conventional short subjects (`feat:`, `fix:`, `refactor:`).

## Stale documentation

`README.md` predates the current auth implementation. Ignore its claims about a `mock` mode with `admin/admin`, a persisted `refreshToken`, and an `authStorage` module — none of those exist. `AGENTS.md` describes the app shell as `src/app`; it is `src/core`.

`DESIGN.MD` is current: it was regenerated from the Neural Terrena Design System canon (Claude Design, August 2026), and `src/styles/tokens.scss` is a direct port of that system's `colors_and_type.css`. Of the canon's three product surfaces, **Map Controls and the Command View shell + timeline are implemented**; Terrain Intelligence is not, The Command View's alerts and rules are implemented.
