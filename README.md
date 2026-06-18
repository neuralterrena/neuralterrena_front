# Neural Terrena

Aplicación React independiente para interfaces de producto de Neural Terrena.

## Stack

- React 19, TypeScript estricto y Vite.
- React Compiler preparado desde la configuración de Vite.
- ESLint type-aware, Vitest y Testing Library.
- Inter servido localmente y assets de marca copiados en `public/`.

## Autenticación

La pantalla inicial es el login. En modo local acepta:

- Usuario: `admin`
- Clave: `admin`

El servicio de autenticación ya está preparado para JWT por API:

```bash
VITE_AUTH_MODE=server
VITE_API_BASE_URL=https://api.example.com
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_REFRESH_PATH=/auth/refresh
```

La gestión de tokens funciona así:

- `accessToken`: solo en memoria.
- `refreshToken`: persistido para restaurar sesión al recargar.
- Cliente HTTP común con `Authorization: Bearer ...` automático para llamadas al backend.
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
