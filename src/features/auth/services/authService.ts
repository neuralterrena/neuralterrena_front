import { authSessionStore } from "./authSessionStore";
import { authStorage } from "./authStorage";
import { AuthError } from "./authTypes";
import type { AuthRefreshSession, AuthSession, AuthTokens, AuthUser, LoginCredentials } from "./authTypes";

type AuthMode = "mock" | "server";

interface AuthConfig {
  apiBaseUrl: string;
  loginPath: string;
  mode: AuthMode;
  refreshPath: string;
}

interface AuthPayload {
  refreshSession: AuthRefreshSession | null;
  session: AuthSession;
}

const getAuthConfig = (): AuthConfig => ({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  loginPath: import.meta.env.VITE_AUTH_LOGIN_PATH ?? "/auth/login",
  mode: import.meta.env.VITE_AUTH_MODE === "server" ? "server" : "mock",
  refreshPath: import.meta.env.VITE_AUTH_REFRESH_PATH ?? "/auth/refresh",
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toBase64Url = (value: string) =>
  globalThis
    .btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const createMockJwt = (user: AuthUser, expiresAt: Date) => {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = Math.floor(expiresAt.getTime() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      exp: expiresAtSeconds,
      iat: issuedAtSeconds,
      jti: `${user.id}-${Date.now()}`,
      name: user.displayName,
      roles: user.roles,
      sub: user.id,
      username: user.username,
    }),
  );

  return `${header}.${payload}.mock-signature`;
};

const createMockRefreshToken = (user: AuthUser) =>
  `refresh.${toBase64Url(JSON.stringify({ sub: user.id, username: user.username }))}.mock`;

const createMockPayload = (user: AuthUser, refreshToken = createMockRefreshToken(user)): AuthPayload => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    refreshSession: {
      authenticatedAt: new Date().toISOString(),
      refreshToken,
      tokenType: "Bearer",
      user,
    },
    session: {
      authenticatedAt: new Date().toISOString(),
      tokens: {
        accessToken: createMockJwt(user, expiresAt),
        expiresAt: expiresAt.toISOString(),
        tokenType: "Bearer",
      },
      user,
    },
  };
};

const readTextSafely = async (response: Response) => {
  try {
    return await response.text();
  } catch {
    return "";
  }
};

const parseUser = (value: unknown, fallbackUser: AuthUser): AuthUser => {
  if (!isRecord(value)) {
    return fallbackUser;
  }

  const username = typeof value.username === "string" ? value.username : fallbackUser.username;

  return {
    displayName: typeof value.displayName === "string" ? value.displayName : fallbackUser.displayName,
    id: typeof value.id === "string" ? value.id : fallbackUser.id,
    roles: Array.isArray(value.roles) ? value.roles.filter((role): role is string => typeof role === "string") : fallbackUser.roles,
    username,
  };
};

const parseTokens = (value: unknown): AuthTokens => {
  if (!isRecord(value)) {
    throw new AuthError("La respuesta de autenticación no es válida.");
  }

  const accessToken = value.accessToken ?? value.token;

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new AuthError("El servidor no devolvió un JWT válido.");
  }

  const expiresAt =
    typeof value.expiresAt === "string"
      ? value.expiresAt
      : new Date(Date.now() + (typeof value.expiresIn === "number" ? value.expiresIn : 3600) * 1000).toISOString();

  return {
    accessToken,
    expiresAt,
    tokenType: "Bearer",
  };
};

const parseRefreshToken = (value: unknown, fallbackRefreshToken?: string) => {
  if (!isRecord(value)) {
    return fallbackRefreshToken;
  }

  if (typeof value.refreshToken === "string" && value.refreshToken.length > 0) {
    return value.refreshToken;
  }

  return fallbackRefreshToken;
};

const createDefaultUser = (username: string): AuthUser => ({
  displayName: username,
  id: username,
  roles: [],
  username,
});

const buildPayload = (data: unknown, fallbackUser: AuthUser, fallbackRefreshToken?: string): AuthPayload => {
  const user = parseUser(isRecord(data) ? data.user : null, fallbackUser);
  const refreshToken = parseRefreshToken(data, fallbackRefreshToken);
  const tokens = parseTokens(data);

  return {
    refreshSession: refreshToken
      ? {
          authenticatedAt: new Date().toISOString(),
          refreshToken,
          tokenType: "Bearer",
          user,
        }
      : null,
    session: {
      authenticatedAt: new Date().toISOString(),
      tokens,
      user,
    },
  };
};

const persistPayload = ({ refreshSession, session }: AuthPayload) => {
  authSessionStore.set(session);

  if (refreshSession) {
    authStorage.save(refreshSession);
  } else {
    authStorage.clear();
  }

  return session;
};

const clearPersistedAuth = () => {
  authSessionStore.clear();
  authStorage.clear();
};

const requestSession = async (endpoint: string, body: Record<string, string> | LoginCredentials) => {
  const response = await fetch(endpoint, {
    body: JSON.stringify(body),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await readTextSafely(response);
    throw new AuthError(message || "No se pudo iniciar sesión.");
  }

  return (await response.json()) as unknown;
};

let refreshInFlight: Promise<AuthSession | null> | null = null;

const loginWithMock = async ({ password, username }: LoginCredentials) => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 240));

  if (username === "admin" && password === "admin") {
    const user: AuthUser = {
      displayName: "Admin",
      id: "usr_admin",
      roles: ["admin"],
      username: "admin",
    };

    return persistPayload(createMockPayload(user));
  }

  throw new AuthError("Usuario o clave no válidos.");
};

const refreshWithMock = async (refreshSession: AuthRefreshSession) => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 120));

  if (!refreshSession.refreshToken.startsWith("refresh.")) {
    clearPersistedAuth();
    return null;
  }

  return persistPayload(createMockPayload(refreshSession.user, refreshSession.refreshToken));
};

const loginWithServer = async (credentials: LoginCredentials, config: AuthConfig): Promise<AuthSession> => {
  if (!config.apiBaseUrl) {
    throw new AuthError("Falta configurar VITE_API_BASE_URL.");
  }

  const endpoint = new URL(config.loginPath, config.apiBaseUrl).toString();
  const data = await requestSession(endpoint, credentials);

  return persistPayload(buildPayload(data, createDefaultUser(credentials.username)));
};

const refreshWithServer = async (refreshSession: AuthRefreshSession, config: AuthConfig) => {
  if (!config.apiBaseUrl) {
    clearPersistedAuth();
    return null;
  }

  const endpoint = new URL(config.refreshPath, config.apiBaseUrl).toString();

  try {
    const data = await requestSession(endpoint, { refreshToken: refreshSession.refreshToken });
    return persistPayload(buildPayload(data, refreshSession.user, refreshSession.refreshToken));
  } catch {
    clearPersistedAuth();
    return null;
  }
};

export const authService = {
  clearSession() {
    clearPersistedAuth();
  },

  getAccessToken() {
    return authSessionStore.get()?.tokens.accessToken ?? null;
  },

  getApiBaseUrl() {
    return getAuthConfig().apiBaseUrl;
  },

  getSession() {
    return authSessionStore.get();
  },

  async login(credentials: LoginCredentials) {
    const config = getAuthConfig();

    return config.mode === "server" ? loginWithServer(credentials, config) : loginWithMock(credentials);
  },

  async refreshSession() {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    const refreshSession = authStorage.load();

    if (!refreshSession) {
      authSessionStore.clear();
      return null;
    }

    const config = getAuthConfig();

    refreshInFlight = (config.mode === "server"
      ? refreshWithServer(refreshSession, config)
      : refreshWithMock(refreshSession)).finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  },

  async restoreSession() {
    return this.refreshSession();
  },

  subscribe(listener: (session: AuthSession | null) => void) {
    return authSessionStore.subscribe(listener);
  },
};
