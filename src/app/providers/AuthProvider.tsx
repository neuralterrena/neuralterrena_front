import { useCallback, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { authService } from "../../features/auth/services/authService";
import type { AuthSession, LoginCredentials } from "../../features/auth/services/authTypes";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => authService.getSession());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = authService.subscribe(setSession);

    void authService.restoreSession().then((restoredSession) => {
      if (!isMounted) {
        return;
      }

      setSession(restoredSession);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsAuthenticating(true);

    try {
      const nextSession = await authService.login(credentials);
      setSession(nextSession);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      isAuthenticating,
      isReady,
      login,
      logout,
      session,
    }),
    [isAuthenticating, isReady, login, logout, session],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
