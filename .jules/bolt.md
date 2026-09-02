## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2026-08-28 - Canvas path batching and hot loop math optimization
**Learning:** In high-frequency rendering loops (like drawing hundreds of wind particles via `requestAnimationFrame`), repeatedly calling `context.beginPath()` and `context.stroke()` for each item creates massive overhead. Furthermore, built-in functions like `Math.hypot` are slower than direct calculations like `Math.sqrt(u * u + v * v)`.
**Action:** Move `context.beginPath()` before the rendering loop and `context.stroke()` after it to batch all line draws into a single operation. Swap `Math.hypot` for explicit arithmetic in hot loops.
