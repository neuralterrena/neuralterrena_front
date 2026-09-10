## 2024-05-18 - Prevent Credential Leakage via SSRF
**Vulnerability:** The application was attaching authentication tokens to any endpoint whose URL started with the API base URL prefix, putting it at risk of credential leakage. For instance, `.startsWith('https://api.example.com/v1')` incorrectly matched URLs like `https://api.example.com/v1-evil`.
**Learning:** `startsWith` on URL strings is not adequate for domain or pathname matching because it ignores URL structure and boundaries.
**Prevention:** Always parse the URL and perform structural validation (e.g., origin comparison and precise path boundary checks, such as using `isUrlWithinBase` which guarantees strict containment within the target origin and path).
