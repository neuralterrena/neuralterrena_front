## 2023-10-27 - [URL Validation SSRF Risk]
**Vulnerability:** `isBackendUrl` used `.startsWith()` to check if a URL matched the API base URL, allowing bypasses like `https://api.example.com.malicious.com`.
**Learning:** Simple string prefix matching is inherently insecure for URL validation, as it ignores origin and path boundaries.
**Prevention:** Always use strict origin and pathname comparisons (like `isUrlWithinBase`) rather than `.startsWith()` for attaching authentication tokens.
