import { authService } from "../model/authService";
import { AuthError } from "../model/authTypes";
import { notifyUnauthorized } from "../model/authNavigation";

interface RequestOptions extends RequestInit {
  authBaseUrl?: string;
  skipAuth?: boolean;
  skipAuthRetry?: boolean;
}

const isBackendUrl = (url: URL) => {
  const apiBaseUrl = authService.getApiBaseUrl();

  if (!apiBaseUrl) {
    return false;
  }

  return url.toString().startsWith(new URL(apiBaseUrl).toString());
};

const isUrlWithinBase = (url: URL, baseUrl?: string) => {
  if (!baseUrl) {
    return false;
  }

  const base = new URL(baseUrl, globalThis.location?.origin ?? "http://localhost");

  if (url.origin !== base.origin) {
    return false;
  }

  const basePath = base.pathname.replace(/\/+$/, "") || "/";

  return basePath === "/" || url.pathname === basePath || url.pathname.startsWith(`${basePath}/`);
};

const resolveUrl = (input: RequestInfo | URL) => {
  if (input instanceof URL) {
    return input;
  }

  if (typeof input === "string") {
    return new URL(input, globalThis.location?.origin ?? "http://localhost");
  }

  return new URL(input.url);
};

const createHeaders = (headers?: HeadersInit) => new Headers(headers);

async function request(input: RequestInfo | URL, options: RequestOptions = {}) {
  const { authBaseUrl, skipAuth = false, skipAuthRetry = false, ...init } = options;
  const url = resolveUrl(input);
  const headers = createHeaders(init.headers);
  const shouldAttachAuth = !skipAuth && (isBackendUrl(url) || isUrlWithinBase(url, authBaseUrl));

  if (shouldAttachAuth) {
    const accessToken = authService.getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status !== 401 || !shouldAttachAuth || skipAuthRetry) {
    return response;
  }

  const refreshedSession = await authService.refreshSession();

  if (!refreshedSession) {
    notifyUnauthorized();
    throw new AuthError("auth.sessionExpired");
  }

  const retryHeaders = createHeaders(init.headers);
  retryHeaders.set("Authorization", `Bearer ${refreshedSession.accessToken}`);

  return fetch(input, { ...init, headers: retryHeaders });
}

export const apiClient = {
  del(input: RequestInfo | URL, options: RequestOptions = {}) {
    return request(input, { ...options, method: "DELETE" });
  },

  get(input: RequestInfo | URL, options: RequestOptions = {}) {
    return request(input, { ...options, method: "GET" });
  },

  patch(input: RequestInfo | URL, options: RequestOptions = {}) {
    return request(input, { ...options, method: "PATCH" });
  },

  post(input: RequestInfo | URL, options: RequestOptions = {}) {
    return request(input, { ...options, method: "POST" });
  },

  put(input: RequestInfo | URL, options: RequestOptions = {}) {
    return request(input, { ...options, method: "PUT" });
  },

  request,
};
