## 2024-05-18 - URL Prefix Matching Credential Leakage
**Vulnerability:** Authorization tokens were potentially leaked to malicious domains because `isBackendUrl` used `.startsWith()` for URL matching (e.g., matching `https://api.example.com.malicious.com`).
**Learning:** Simple string prefix matching on URLs is dangerous and can lead to SSRF or credential leakage.
**Prevention:** Always use strict origin and pathname comparisons (like the `isUrlWithinBase` utility) when validating URLs for sensitive operations or attaching credentials.
