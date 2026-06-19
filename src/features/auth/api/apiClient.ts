import { authService } from "../model/authService";
import { AuthError } from "../model/authTypes";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

const isBackendUrl = (url: URL) => {
  const apiBaseUrl = authService.getApiBaseUrl();

  if (!apiBaseUrl) {
    return false;
  }

  return url.toString().startsWith(new URL(apiBaseUrl).toString());
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
  const { skipAuth = false, ...init } = options;
  const url = resolveUrl(input);
  const headers = createHeaders(init.headers);
  const shouldAttachAuth = !skipAuth && isBackendUrl(url);

  if (shouldAttachAuth) {
    const accessToken = authService.getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status !== 401 || !shouldAttachAuth) {
    return response;
  }

  const refreshedSession = await authService.refreshSession();

  if (!refreshedSession) {
    throw new AuthError("auth.sessionExpired");
  }

  const retryHeaders = createHeaders(init.headers);
  retryHeaders.set("Authorization", `Bearer ${refreshedSession.tokens.accessToken}`);

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
