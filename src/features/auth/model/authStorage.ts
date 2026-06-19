import type { AuthRefreshSession } from "./authTypes";

const STORAGE_KEY = "nt.console.auth.refresh.v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isAuthRefreshSession = (value: unknown): value is AuthRefreshSession => {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }

  return (
    typeof value.authenticatedAt === "string" &&
    typeof value.refreshToken === "string" &&
    value.tokenType === "Bearer" &&
    typeof value.user.id === "string" &&
    typeof value.user.username === "string" &&
    typeof value.user.displayName === "string" &&
    isStringArray(value.user.roles)
  );
};

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const authStorage = {
  clear() {
    getStorage()?.removeItem(STORAGE_KEY);
  },

  load() {
    const storedValue = getStorage()?.getItem(STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (!isAuthRefreshSession(parsedValue)) {
        this.clear();
        return null;
      }

      return parsedValue;
    } catch {
      this.clear();
      return null;
    }
  },

  save(session: AuthRefreshSession) {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(session));
  },
};
