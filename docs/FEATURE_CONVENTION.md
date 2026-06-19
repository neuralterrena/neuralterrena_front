# Feature Convention

Esta es la convención fija para cualquier feature nueva del proyecto. La idea es que el árbol crezca por dominio, no por tipo técnico global.

## Objetivo

Cada feature debe ser:

- aislable
- fácil de localizar
- fácil de borrar o refactorizar
- dueña de su propia lógica de negocio

## Estructura base

```text
src/features/<feature>/
  api/
    <feature>Client.ts
    <feature>Mappers.ts
  model/
    types.ts
    use<Feature>.ts
    <feature>Service.ts
    <feature>Store.ts
  ui/
    <Feature>Page.tsx
    <Feature>Panel.tsx
    <Feature>Form.tsx
  index.ts
```

La estructura es modular, no rígida. Solo se crean carpetas y archivos que la feature necesita.

## Regla de cada carpeta

`ui/`

- componentes React de la feature
- composición visual
- handlers de interacción simples
- adaptación de datos para render

No debería contener:

- acceso directo a `localStorage`
- llamadas `fetch`
- reglas de negocio complejas

`model/`

- tipos y contratos internos
- hooks de dominio
- stores de estado local o suscripción
- servicios de negocio
- validaciones y reglas de comportamiento

`api/`

- clientes HTTP
- serialización y deserialización
- adaptación entre payload externo y modelo interno
- manejo técnico de requests y responses

`index.ts`

- API pública de la feature
- reexporta solo lo que otras capas pueden consumir

## Reglas de importación

- Dentro de una misma feature, usar imports relativos cortos.
- Desde `core` o desde otra feature, importar solo desde `@/features/<feature>`.
- No consumir archivos internos de otra feature como `@/features/<otra>/model/...`.
- Lo compartido entre varias features vive en `@/shared`, pero solo cuando ya existe una necesidad real en más de una feature.

## Criterio para subir algo a `shared`

Sube algo a `shared` solo si cumple una de estas condiciones:

- lo usan dos o más features
- representa infraestructura transversal
- no pertenece semánticamente a un dominio concreto

No subir a `shared`:

- componentes demasiado específicos aunque sean reutilizables por accidente
- hooks con conocimiento de un dominio
- tipos de backend de una sola feature

## API pública recomendada

Ejemplo:

```ts
export { TerrainPage } from "./ui/TerrainPage";
export { useTerrain } from "./model/useTerrain";
export type { TerrainItem } from "./model/types";
```

La idea es que desde fuera se consuma así:

```ts
import { TerrainPage, useTerrain } from "@/features/terrain";
```

## Flujo recomendado al crear una feature

1. Crear `src/features/<feature>/`.
2. Añadir `ui`, `model` y `api` solo si hacen falta.
3. Crear `index.ts` desde el primer día.
4. Mantener toda la lógica dentro de la feature hasta que haya un motivo real para extraerla.
5. Añadir tests cerca del módulo que validan.

## Naming

- Carpeta de feature: `kebab` corto y semántico. Ejemplo: `terrain-analysis`.
- Componentes React: `PascalCase`.
- Hooks: `useX`.
- Servicios y stores: `<feature>Service`, `<feature>Store`.
- Tipos compartidos dentro de la feature: `types.ts` o `<feature>Types.ts`.

## Tests

Ubicación recomendada:

- tests de UI junto al componente
- tests de servicios junto al servicio
- tests de integración pequeños junto a la feature

Ejemplos:

```text
src/features/terrain/model/terrainService.test.ts
src/features/terrain/ui/TerrainPage.test.tsx
```

## Checklist antes de cerrar una feature

- Tiene `index.ts`.
- No expone detalles internos innecesarios.
- No importa internals de otra feature.
- La lógica de negocio no está embebida en la UI.
- El acceso a APIs externas no está embebido en componentes.
- Si algo se movió a `shared`, existe un segundo uso real.
