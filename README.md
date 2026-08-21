# Neural Terrena

Aplicación React independiente para interfaces de producto de Neural Terrena.

## Stack

- React 19, TypeScript estricto y Vite.
- React Compiler preparado desde la configuración de Vite.
- ESLint type-aware, Vitest y Testing Library.
- Inter servido localmente y assets de marca copiados en `public/`.

## Arquitectura

La base del proyecto queda organizada en tres capas:

- `src/core`: composición global de la aplicación, providers raíz y routing/app shell.
- `src/features`: dominios funcionales aislados, cada uno con su propia `ui`, `model` y `api` cuando aplique.
- `src/shared`: piezas reutilizables transversales como providers globales, componentes comunes, utilidades e i18n.

Convenciones recomendadas para crecer sin fricción:

- Cada feature expone una API pública mediante su `index.ts`.
- Los imports internos usan el alias `@/` para evitar rutas relativas largas y frágiles.
- La lógica de dominio vive dentro de su feature; lo compartido solo sube a `shared` si realmente lo usan varios módulos.
- Toda nueva feature sigue la convención fija documentada en `docs/FEATURE_CONVENTION.md`.

### Convención Fija Para Features

Estructura base:

```text
src/features/<feature>/
  api/
  model/
  ui/
  index.ts
```

Reglas:

- `ui/`: componentes de pantalla, widgets de la feature y lógica estrictamente visual.
- `model/`: tipos, hooks, stores, servicios de dominio y reglas de negocio.
- `api/`: clientes HTTP, adaptadores y mapeos de payloads externos.
- `index.ts`: única API pública de la feature para el resto de la app.
- Si una feature no necesita `api/`, no se crea vacía.
- Si algo empieza siendo de una feature, se queda ahí hasta que al menos dos features lo necesiten.

Importaciones:

- Entre archivos de la misma feature se permiten rutas relativas cortas.
- Desde fuera de la feature se importa siempre desde `@/features/<feature>`.
- Nunca se importa desde subrutas internas de otra feature salvo infraestructura muy justificada.

## Autenticación

La pantalla inicial es el login. En modo local acepta:

- Usuario: `admin`
- Clave: `admin`

El servicio de autenticación ya está preparado para JWT por API:

```bash
VITE_API_BASE_URL=https://api.example.com
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_REFRESH_PATH=/auth/refresh
VITE_FORECAST_HUB_API_BASE_URL=https://forecast.example.com
```

La gestión de tokens funciona así:

- `accessToken`: solo en memoria.
- `refreshToken`: persistido para restaurar sesión al recargar.
- Cliente HTTP común con `Authorization: Bearer ...` automático para llamadas al backend y al Forecast Hub configurado.
- Si una respuesta devuelve `401`, se intenta `POST` al endpoint de refresh y se reintenta la llamada original una vez.

El backend esperado debe responder a `POST /auth/login` y `POST /auth/refresh` con `accessToken` y, cuando proceda, `refreshToken`, `expiresIn`, `expiresAt` y `user`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```
