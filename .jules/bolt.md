## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2026-08-28 - Math.hypot performance overhead in hot render loops
**Learning:** `Math.hypot(x, y)` has a significant overhead compared to manual calculation `Math.sqrt(x*x + y*y)`. In V8, `Math.hypot` protects against overflow/underflow and handles an arbitrary number of arguments, making it roughly 20x slower. Inside a `requestAnimationFrame` loop animating 360 particles at 60fps (21,600 calls/sec), this creates measurable CPU load.
**Action:** Replace `Math.hypot(x, y)` with `Math.sqrt(x * x + y * y)` in all hot rendering loops or physics calculations where extreme overflow/underflow isn't realistically possible.
