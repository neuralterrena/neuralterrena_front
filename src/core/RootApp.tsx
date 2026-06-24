import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "@/core/providers/AppProviders";
import { AppRouter } from "@/core/router/AppRouter";

export function RootApp() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  );
}
