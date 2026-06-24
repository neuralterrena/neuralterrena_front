import { useCallback, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { authService } from "./authService";
import type { AuthSession, AuthStatus, LoginCredentials, PasswordResetConfirmInput, PasswordResetRequest } from "./authTypes";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => authService.getSession());
  const [status, setStatus] = useState<AuthStatus>(() => (authService.getSession() ? "authenticated" : "bootstrapping"));
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = authService.subscribe((nextState) => {
      if (!isMounted) {
        return;
      }

      setSession(nextState.session);
      setStatus(nextState.status);
    });

    void authService.bootstrapSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsAuthenticating(true);

    try {
      return await authService.login(credentials);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsAuthenticating(true);

    try {
      await authService.logout();
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const requestPasswordReset = useCallback((payload: PasswordResetRequest) => authService.requestPasswordReset(payload), []);

  const resetPassword = useCallback((payload: PasswordResetConfirmInput) => authService.resetPassword(payload), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: status === "authenticated" && session !== null,
      isAuthenticating,
      isBootstrapping: status === "bootstrapping",
      isReady: status !== "bootstrapping",
      login,
      logout,
      requestPasswordReset,
      resetPassword,
      session,
      status,
    }),
    [isAuthenticating, login, logout, requestPasswordReset, resetPassword, session, status],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
