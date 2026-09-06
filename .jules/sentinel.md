## 2025-02-18 - SSRF / Token Leakage in Backend URL Detection
**Vulnerability:** The `isBackendUrl` function used a simple string `.startsWith` check on the URL string vs the base API URL. This meant an attacker could register a domain with a matching path prefix (e.g., `https://api.example.com/v1-malicious` matching `https://api.example.com/v1`) to intercept requests containing the user's `Authorization: Bearer <token>`.
**Learning:** Checking URL containment by comparing string prefixes is inherently unsafe as it ignores URL boundaries (path separators or domain boundaries).
**Prevention:** Always parse URLs and utilize origin + exact path matching algorithms (like the existing `isUrlWithinBase` utility) to verify URL containment and authorization attachment safely.
