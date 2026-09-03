## 2026-08-26 - O(N) Array Reduction in requestAnimationFrame is a Bottleneck
**Learning:** `WindParticles.tsx` calculates the closest latitude and longitude index on a grid (often 721x1440 resolution) for every particle (e.g. 360) on *every single frame*. The old approach used `reduce`, creating an `O(N)` scan per coordinate, leading to massive frame drops and severe battery consumption on mobile devices.
**Action:** Replace `O(N)` scans within `requestAnimationFrame` loops with `O(log N)` binary search or precomputed spatial indices.
## 2026-08-27 - Canvas state reset in requestAnimationFrame
**Learning:** Reassigning a `<canvas>` element's `width` or `height` clears its drawing buffer and resets its 2D context state. In `WindParticles.tsx`, unconditionally updating `canvas.width` and `canvas.height` on every frame inside `requestAnimationFrame` caused an expensive re-allocation and state reset, severely impacting performance.
**Action:** Conditionally update `canvas.width` and `canvas.height` (e.g. `if (canvas.width !== nextWidth)`) to avoid triggering unnecessary resets when dimensions haven't actually changed.
## 2024-05-18 - Math.hypot performance overhead in high-frequency loops
**Learning:** `Math.hypot` is surprisingly slow in V8 (JavaScript) compared to manually calculating the hypotenuse with `Math.sqrt(x*x + y*y)`. In high-frequency render loops like `requestAnimationFrame` drawing 360+ particles 60 times a second, this overhead adds up significantly, hurting framerates and battery life.
**Action:** Always prefer `Math.sqrt(x*x + y*y)` over `Math.hypot(x, y)` in hot code paths or tight loops, provided overflow/underflow edge cases (which `Math.hypot` handles defensively) are not a concern.
