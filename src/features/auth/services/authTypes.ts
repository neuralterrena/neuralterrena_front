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

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
