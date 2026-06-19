export interface LoginCredentials {
  password: string;
  username: string;
}

export interface AuthUser {
  displayName: string;
  id: string;
  roles: string[];
  username: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: string;
  tokenType: "Bearer";
}

export interface AuthSession {
  authenticatedAt: string;
  tokens: AuthTokens;
  user: AuthUser;
}

export interface AuthRefreshSession {
  authenticatedAt: string;
  refreshToken: string;
  tokenType: "Bearer";
  user: AuthUser;
}

export type AuthErrorCode =
  | "auth.invalidCredentials"
  | "auth.invalidJwt"
  | "auth.invalidResponse"
  | "auth.loginFailed"
  | "auth.missingApiBaseUrl"
  | "auth.sessionExpired"
  | "auth.sessionValidationFailed";

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
