import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ConsoleHome } from "@/features/console";
import {
  ForgotPasswordPage,
  LoginPage,
  RequireAuth,
  ResetPasswordConfirmPage,
  useAuth,
} from "@/features/auth";
import { registerUnauthorizedHandler } from "@/features/auth/model/authNavigation";

function AuthNavigationSync() {
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      void navigate("/login", { replace: true });
    });

    return () => {
      registerUnauthorizedHandler(null);
    };
  }, [navigate]);

  return null;
}

export function AppRouter() {
  const { isReady } = useAuth();

  if (!isReady) {
    return <div className="app-loading-state" role="status" aria-live="polite" />;
  }

  return (
    <>
      <AuthNavigationSync />
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<ForgotPasswordPage />} path="/forgot-password" />
        <Route element={<ResetPasswordConfirmPage />} path="/reset-password" />
        <Route
          element={
            <RequireAuth>
              <ConsoleHome />
            </RequireAuth>
          }
          path="/"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </>
  );
}
