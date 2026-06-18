# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite + React 19 + strict TypeScript frontend. Source code lives under `src/` and follows a layered structure:

- `src/app`: app shell, root providers, and routing.
- `src/features`: isolated feature domains such as `auth` and `console`, usually split into `ui`, `model`, and `api`.
- `src/shared`: reusable providers, UI primitives, utilities, and i18n.
- `public/`: static assets such as brand images and local fonts.

Prefer each feature exposing a public entry point through `index.ts`. Use the `@/` alias for imports from `src/`.

## Build, Test, and Development Commands

- `npm run dev`: start the local Vite dev server on `127.0.0.1`.
- `npm run build`: run TypeScript project builds, then create the production bundle in `dist/`.
- `npm run preview`: serve the built app locally for a production-like check.
- `npm run lint`: run ESLint across the repo.
- `npm run test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode during development.

## Coding Style & Naming Conventions

Use TypeScript with `strict` mode intact and keep React components in `.tsx` files. The existing codebase uses 2-space indentation, semicolons, and double quotes. Keep feature folders and utility files in lower camel or descriptive lowercase names such as `authService.ts`, `ThemeProvider.tsx`, and `formatDateTime.ts`.

ESLint is configured in `eslint.config.js` with type-aware rules, `react-hooks`, and `react-refresh`. Run `npm run lint` before opening a PR.

## Testing Guidelines

Vitest and Testing Library are the active test stack, with `jsdom` configured in `vitest.config.ts` and shared setup in `src/test/setup.ts`. Place tests beside the code they cover using `*.test.ts` or `*.test.tsx` naming, as in `src/features/auth/model/authService.test.ts`.

Cover user-visible behavior and auth/session edge cases. For UI changes, include at least one render-level test when practical.

## Commit & Pull Request Guidelines

Recent history uses short conventional subjects such as `feat: ...` and `refactor: ...`. Keep commit messages imperative and scoped by intent, for example `fix: handle expired refresh token`.

PRs should include a brief summary, testing notes, linked issues when relevant, and screenshots for UI changes. If auth behavior or environment variables change, document the required `VITE_AUTH_*` settings in the PR description.
