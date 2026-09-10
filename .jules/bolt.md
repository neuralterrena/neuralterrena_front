## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2026-08-28 - MapLibre transformRequest Bottleneck
**Learning:** In Mapbox/MapLibre (`maplibre-gl`), the `transformRequest` callback fires for *every* requested tile, glyph, and sprite. Performing expensive object instantiations (like `new URL()`) inside this callback causes severe garbage collection pressure and main-thread blocking, significantly degrading map performance and panning smoothness.
**Action:** Always pre-calculate any required variables (e.g., base origin strings) outside the `Map` instance or `transformRequest` closure to avoid redundant allocations on every network request.
