import { ConsoleHome } from "@/features/console";
import { LoginPage, useAuth } from "@/features/auth";

export function AppRouter() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  return isAuthenticated ? <ConsoleHome /> : <LoginPage />;
}
