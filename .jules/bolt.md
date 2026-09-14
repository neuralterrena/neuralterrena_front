## 2024-05-18 - HTML5 Canvas Batch Path Drawing
**Learning:** Rendering many distinct Canvas 2D paths using `beginPath()` and `stroke()` per item (e.g., in a loop processing hundreds of particles) incurs significant CPU and GPU overhead, causing high frame drop rates when integrated in a `requestAnimationFrame` loop.
**Action:** When drawing hundreds of elements with the same color/style, batch path operations by calling `beginPath()` once outside the loop, `moveTo()`/`lineTo()` per subpath inside the loop, and `stroke()` once at the end.
