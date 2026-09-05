import { authSessionStore } from "./authSessionStore";
import type { AuthStoreState } from "./authSessionStore";
import { AuthError } from "./authTypes";
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  PasswordResetConfirmInput,
  PasswordResetRequest,
} from "./authTypes";

interface AuthConfig {
  apiBaseUrl: string;
  loginPath: string;
  logoutPath: string;
  passwordResetConfirmPath: string;
  passwordResetPath: string;
  refreshPath: string;
}

interface AccessTokenResponse {
  access: string;
}

const getAuthConfig = (): AuthConfig => ({
  apiBaseUrl: typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL : "",
  loginPath: typeof import.meta.env.VITE_AUTH_LOGIN_PATH === "string" ? import.meta.env.VITE_AUTH_LOGIN_PATH : "/api/auth/login/",
  logoutPath:
    typeof import.meta.env.VITE_AUTH_LOGOUT_PATH === "string"
      ? import.meta.env.VITE_AUTH_LOGOUT_PATH
      : "/api/auth/token/logout/",
  passwordResetConfirmPath:
    typeof import.meta.env.VITE_AUTH_PASSWORD_RESET_CONFIRM_PATH === "string"
      ? import.meta.env.VITE_AUTH_PASSWORD_RESET_CONFIRM_PATH
      : "/api/auth/password-reset/confirm/",
  passwordResetPath:
    typeof import.meta.env.VITE_AUTH_PASSWORD_RESET_PATH === "string"
      ? import.meta.env.VITE_AUTH_PASSWORD_RESET_PATH
      : "/api/auth/password-reset/",
  refreshPath:
    typeof import.meta.env.VITE_AUTH_REFRESH_PATH === "string"
      ? import.meta.env.VITE_AUTH_REFRESH_PATH
      : "/api/auth/token/refresh/",
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const decodeBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return globalThis.atob(`${normalized}${padding}`);
};

const getEndpoint = (path: string) => {
  const { apiBaseUrl } = getAuthConfig();

  if (!apiBaseUrl) {
    throw new AuthError("auth.missingApiBaseUrl");
  }

  return new URL(path, apiBaseUrl).toString();
};

const parseAuthError = async (response: Response, fallbackCode: AuthError["code"]) => {
  const code = response.status === 401 && fallbackCode === "auth.loginFailed" ? "auth.invalidCredentials" : fallbackCode;

  try {
    const data: unknown = await response.clone().json();

    if (isRecord(data)) {
      if (typeof data.detail === "string" && data.detail.length > 0) {
        return new AuthError(code, data.detail);
      }

      const firstStringValue = Object.values(data).find((value) => typeof value === "string");

      if (typeof firstStringValue === "string" && firstStringValue.length > 0) {
        return new AuthError(code, firstStringValue);
      }
    }
  } catch {
    // Ignore body parsing errors and fall back to text.
  }

  try {
    const text = await response.text();

    if (text) {
      if (text.trim().toLowerCase().startsWith("<!doctype html") || text.trim().toLowerCase().startsWith("<html")) {
        return new AuthError(code);
      }
      return new AuthError(code, text);
    }
  } catch {
    // Ignore read errors and return the fallback error below.
  }

  return new AuthError(code);
};

const buildUserFromAccessToken = (accessToken: string): AuthUser => {
  const [, payloadSegment] = accessToken.split(".");

  if (!payloadSegment) {
    throw new AuthError("auth.invalidJwt");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(decodeBase64Url(payloadSegment));
  } catch {
    throw new AuthError("auth.invalidJwt");
  }

  if (!isRecord(payload)) {
    throw new AuthError("auth.invalidJwt");
  }

  const id = typeof payload.sub === "string" ? payload.sub : typeof payload.user_id === "string" ? payload.user_id : "";

  if (!id) {
    throw new AuthError("auth.invalidJwt");
  }

  const email = typeof payload.email === "string" ? payload.email : "";
  const displayNameCandidates = [payload.name, payload.full_name, payload.email, payload.sub];
  const displayName = displayNameCandidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? id;
  const roles = Array.isArray(payload.roles) ? payload.roles.filter((value): value is string => typeof value === "string") : [];

  return {
    displayName,
    email,
    id,
    roles,
  };
};

const buildSession = (accessToken: string): AuthSession => {
  const [, payloadSegment] = accessToken.split(".");

  if (!payloadSegment) {
    throw new AuthError("auth.invalidJwt");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(decodeBase64Url(payloadSegment));
  } catch {
    throw new AuthError("auth.invalidJwt");
  }

  if (!isRecord(payload) || typeof payload.exp !== "number") {
    throw new AuthError("auth.invalidJwt");
  }

  return {
    accessToken,
    authenticatedAt: new Date().toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    user: buildUserFromAccessToken(accessToken),
  };
};

const persistSession = (session: AuthSession | null) => {
  const state: AuthStoreState =
    session === null
      ? {
          session: null,
          status: "anonymous",
        }
      : {
          session,
          status: "authenticated",
        };

  authSessionStore.set(state);
  return session;
};

const sendJson = async <T>(path: string, init: RequestInit, fallbackCode: AuthError["code"]) => {
  const response = await fetch(getEndpoint(path), init);

  if (!response.ok) {
    throw await parseAuthError(response, fallbackCode);
  }

  return (await response.json()) as T;
};

const sendWithoutResponseBody = async (path: string, init: RequestInit, fallbackCode: AuthError["code"]) => {
  const response = await fetch(getEndpoint(path), init);

  if (!response.ok) {
    throw await parseAuthError(response, fallbackCode);
  }
};

let refreshInFlight: Promise<AuthSession | null> | null = null;

async function requestAccessToken(path: string, init: RequestInit, fallbackCode: AuthError["code"]) {
  const data = await sendJson<AccessTokenResponse>(path, init, fallbackCode);

  if (!isRecord(data) || typeof data.access !== "string" || data.access.length === 0) {
    throw new AuthError("auth.invalidResponse");
  }

  return buildSession(data.access);
}

export const authService = {
  async bootstrapSession() {
    authSessionStore.set({
      session: authSessionStore.get().session,
      status: "bootstrapping",
    });

    try {
      return await this.refreshSession();
    } catch {
      this.clearSession();
      return null;
    }
  },

  clearSession() {
    persistSession(null);
  },

  getAccessToken() {
    return authSessionStore.get().session?.accessToken ?? null;
  },

  getApiBaseUrl() {
    return getAuthConfig().apiBaseUrl;
  },

  getSession() {
    return authSessionStore.get().session;
  },

  getStatus() {
    return authSessionStore.get().status;
  },

  async login(credentials: LoginCredentials) {
    const session = await requestAccessToken(
      getAuthConfig().loginPath,
      {
        body: JSON.stringify(credentials),
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      "auth.loginFailed",
    );

    return persistSession(session) as AuthSession;
  },

  async logout() {
    try {
      await sendWithoutResponseBody(
        getAuthConfig().logoutPath,
        {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          method: "POST",
        },
        "auth.logoutFailed",
      );
    } catch {
      // The app must return to an anonymous state even if backend logout fails.
    } finally {
      this.clearSession();
    }
  },

  async refreshSession() {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = requestAccessToken(
      getAuthConfig().refreshPath,
      {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        method: "POST",
      },
      "auth.refreshFailed",
    )
      .then((session) => persistSession(session))
      .catch((error) => {
        this.clearSession();

        if (error instanceof AuthError) {
          return null;
        }

        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
  },

  async requestPasswordReset(payload: PasswordResetRequest) {
    await sendWithoutResponseBody(
      getAuthConfig().passwordResetPath,
      {
        body: JSON.stringify(payload),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      "auth.passwordResetFailed",
    );
  },

  async resetPassword(payload: PasswordResetConfirmInput) {
    await sendWithoutResponseBody(
      getAuthConfig().passwordResetConfirmPath,
      {
        body: JSON.stringify(payload),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      "auth.passwordResetFailed",
    );
  },

  subscribe(listener: (state: AuthStoreState) => void) {
    return authSessionStore.subscribe(listener);
  },
};
