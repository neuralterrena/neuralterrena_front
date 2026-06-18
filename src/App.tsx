import { AuthProvider } from "./app/providers/AuthProvider";
import { LanguageProvider } from "./app/providers/LanguageProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
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
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
