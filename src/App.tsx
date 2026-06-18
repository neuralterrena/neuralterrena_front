import { AuthProvider } from "./app/providers/AuthProvider";
import { useAuth } from "./app/providers/useAuth";
import { LoginPage } from "./features/auth/components/LoginPage";
import { ConsoleHome } from "./features/console/components/ConsoleHome";

function AuthenticatedApp() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  return isAuthenticated ? <ConsoleHome /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
