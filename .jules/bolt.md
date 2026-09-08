## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2026-08-28 - Expensive MapLibre transformRequest object parsing
**Learning:** In MapLibre GL, the `transformRequest` function is called hundreds of times during initialization and pan/zoom events for every tile, sprite, and glyph. Performing `new URL(url)` parsing inside this high-frequency callback causes unnecessary garbage collection pressure and main thread blocking, which can drop frames during map rendering.
**Action:** Pre-compute origins and use fast string matching methods (`startsWith`) in `transformRequest`, falling back to `new URL()` only for unhandled edge cases.
