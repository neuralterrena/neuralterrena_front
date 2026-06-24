import { createContext } from "react";
import type { AuthSession, AuthStatus, LoginCredentials, PasswordResetConfirmInput, PasswordResetRequest } from "./authTypes";

export interface AuthContextValue {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isBootstrapping: boolean;
  isReady: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => Promise<void>;
  requestPasswordReset: (payload: PasswordResetRequest) => Promise<void>;
  resetPassword: (payload: PasswordResetConfirmInput) => Promise<void>;
  session: AuthSession | null;
  status: AuthStatus;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
