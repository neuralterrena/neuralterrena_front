## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2024-05-18 - Canvas path batching in requestAnimationFrame
**Learning:** Native 2D Canvas methods like `beginPath()` and `stroke()` trigger relatively expensive crossings from JavaScript to C++ when used rapidly inside a `requestAnimationFrame` loop. Calling them inside a `for` loop (e.g. for hundreds of particles per frame) drastically slows down rendering and hurts battery life.
**Action:** When drawing many identical/similar primitives in a frame, open a single path (`context.beginPath()`) before the loop, only append path segments (`moveTo`, `lineTo`) inside the loop, and then call `context.stroke()` exactly once after the loop.
