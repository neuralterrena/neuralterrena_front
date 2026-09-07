## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.

## 2024-05-18 - Avoid URL parsing in MapLibre transformRequest hot path
**Learning:** Instantiating `new URL()` inside MapLibre's `transformRequest` function creates a severe performance bottleneck because the callback executes for every map tile request. This forces the main thread to do expensive string parsing and creates substantial garbage collection overhead, risking micro-stutters in frame rates.
**Action:** Always pre-calculate parsed URLs outside of high-frequency callbacks (like map render loops or tile interceptors), and use fast-path string methods (`startsWith`) to match origins.
