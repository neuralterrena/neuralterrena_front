import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * This runner exposes no `localStorage`, so anything that persists a
 * preference — theme, typography, the session bootstrap, command rules —
 * silently degrades and its tests fail on `undefined`.
 *
 * The app already guards every access with `globalThis.localStorage?.`, so the
 * gap is only in the test environment. An in-memory implementation restores
 * the behaviour under test without changing how the app reads storage.
 */
if (!globalThis.localStorage) {
  const entries = new Map<string, string>();

  const memoryStorage: Storage = {
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage,
    writable: true,
  });
}

/**
 * Storage is process-wide, so a test that persists a preference would hand it
 * to the next one — a language switch in one case would leave the following
 * case rendering in the wrong language. Every test starts from empty.
 */
beforeEach(() => {
  globalThis.localStorage.clear();
});
