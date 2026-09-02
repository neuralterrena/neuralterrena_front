
## 2024-05-17 - Token Leakage via String Prefix Matching
**Vulnerability:** The API client's `isBackendUrl` logic attached `Authorization: Bearer <token>` to requests by checking `url.toString().startsWith(apiBaseUrl.toString())`. Since `apiBaseUrl` lacked a trailing slash if it contained a path (like `/api`), requests to domains like `/api-malicious` were incorrectly trusted.
**Learning:** URL prefix matching with raw strings is insecure for authorization boundaries. `new URL("https://api.com/v1").toString()` yields `"https://api.com/v1"` (no trailing slash), which erroneously prefixes `"https://api.com/v1-malicious"`.
**Prevention:** Always compare structured URL components (`origin` and strict `pathname` segments) when making authorization decisions, rather than using generic `startsWith` on the entire URL string.
