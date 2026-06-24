import type { AuthSession, AuthStatus } from "./authTypes";

export interface AuthStoreState {
  session: AuthSession | null;
  status: AuthStatus;
}

let currentState: AuthStoreState = {
  session: null,
  status: "bootstrapping",
};
const listeners = new Set<(state: AuthStoreState) => void>();

const notify = () => {
  for (const listener of listeners) {
    listener(currentState);
  }
};

export const authSessionStore = {
  clear() {
    currentState = {
      session: null,
      status: "anonymous",
    };
    notify();
  },

  get() {
    return currentState;
  },

  set(state: AuthStoreState) {
    currentState = state;
    notify();
  },

  subscribe(listener: (state: AuthStoreState) => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
