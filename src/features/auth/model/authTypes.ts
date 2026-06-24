export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmInput {
  newPassword: string;
  token: string;
  uid: string;
}

export interface AuthUser {
  displayName: string;
  email: string;
  id: string;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  authenticatedAt: string;
  expiresAt: string;
  user: AuthUser;
}

export type AuthStatus = "anonymous" | "authenticated" | "bootstrapping";

export type AuthErrorCode =
  | "auth.invalidCredentials"
  | "auth.invalidJwt"
  | "auth.invalidResponse"
  | "auth.loginFailed"
  | "auth.logoutFailed"
  | "auth.missingApiBaseUrl"
  | "auth.passwordResetFailed"
  | "auth.passwordResetInvalidLink"
  | "auth.refreshFailed"
  | "auth.sessionExpired"
  | "auth.sessionValidationFailed"
  | "auth.unauthorized";

export class AuthError extends Error {
  code: AuthErrorCode;
  fallbackMessage?: string;

  constructor(code: AuthErrorCode, fallbackMessage?: string) {
    super(fallbackMessage ?? code);
    this.name = "AuthError";
    this.code = code;
    this.fallbackMessage = fallbackMessage;
  }
}
