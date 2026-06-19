import type { AuthSession } from "./authTypes";

let currentSession: AuthSession | null = null;
const listeners = new Set<(session: AuthSession | null) => void>();

const notify = () => {
  for (const listener of listeners) {
    listener(currentSession);
  }
};

export const authSessionStore = {
  clear() {
    currentSession = null;
    notify();
  },

  get() {
    return currentSession;
  },

  set(session: AuthSession | null) {
    currentSession = session;
    notify();
  },

  subscribe(listener: (session: AuthSession | null) => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
