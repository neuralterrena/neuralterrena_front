import { AppProviders } from "@/core/providers/AppProviders";
import { AppRouter } from "@/core/router/AppRouter";

export function RootApp() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
