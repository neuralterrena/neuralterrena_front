import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRequireAuth } from "../model/useRequireAuth";

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useRequireAuth();

  if (isBootstrapping) {
    return <div className="app-loading-state" role="status" aria-live="polite" />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
