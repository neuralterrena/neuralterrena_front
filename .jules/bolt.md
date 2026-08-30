## 2025-02-18 - Canvas Path Batching
**Learning:** Calling `beginPath()` and `stroke()` for every shape inside a hot loop (like a particle system) causes a severe performance bottleneck due to excessive draw calls, dropping frame rates.
**Action:** Lift `beginPath()` and `stroke()` outside loops when drawing many paths with the same style. Record only the sub-paths (`moveTo`, `lineTo`) inside the loop, turning O(N) draw calls into O(1).
