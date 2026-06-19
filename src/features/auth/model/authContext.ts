import { createContext } from "react";
import type { AuthSession, LoginCredentials } from "./authTypes";

export interface AuthContextValue {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isReady: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  session: AuthSession | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
