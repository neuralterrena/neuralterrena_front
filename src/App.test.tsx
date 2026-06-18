import { authSessionStore } from "./features/auth/services/authSessionStore";
import { authService } from "./features/auth/services/authService";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    authService.clearSession();
    localStorage.clear();
  });

  it("renders the login screen first", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("Clave")).toBeInTheDocument();
  });

  it("authenticates with the local admin credentials", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("Usuario"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Panel operativo" })).toBeInTheDocument();
    });
  });

  it("shows a concise error for invalid credentials", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("Usuario"), { target: { value: "operator" } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Usuario o clave no válidos.");
    });
  });

  it("restores the authenticated session on reload using the refresh token", async () => {
    await authService.login({ password: "admin", username: "admin" });
    authSessionStore.clear();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Panel operativo" })).toBeInTheDocument();
    });
  });
});
