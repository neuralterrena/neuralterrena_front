## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2026-08-28 - Canvas 2D Batching in Particles Animation
**Learning:** Drawing many separate paths (`beginPath()` + `stroke()` for every particle) inside `requestAnimationFrame` creates severe CPU bottleneck due to context switching between JS and native canvas layer. Also, `Math.hypot` is noticeably slower than `Math.sqrt(u*u + v*v)` when called hundreds of thousands of times.
**Action:** When drawing multiple similar vectors on a Canvas, move `beginPath()` and `stroke()` outside the iteration loop to batch commands into a single draw call. Use fast math primitives (`Math.sqrt`) over general utility functions for hot path calculation.
