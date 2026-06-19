import { authSessionStore } from "@/features/auth/model/authSessionStore";
import { authService } from "@/features/auth/model/authService";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";

describe("App", () => {
  beforeEach(() => {
    authService.clearSession();
    localStorage.clear();
    document.documentElement.lang = "es";
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
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

  it("switches the interface language to English", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Iniciar sesión" });
    fireEvent.click(screen.getByRole("button", { name: "Inglés" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches the interface theme to dark", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Iniciar sesión" });
    fireEvent.click(screen.getByRole("button", { name: "Oscuro" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    expect(localStorage.getItem("nt.theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("restores the authenticated session on reload using the refresh token", async () => {
    await authService.login({ password: "admin", username: "admin" });
    authSessionStore.clear();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Panel operativo" })).toBeInTheDocument();
    });
  });

  it("opens the user menu in the dashboard and signs out from there", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("Usuario"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Panel operativo" })).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByLabelText("Navegación principal"));
    fireEvent.click(screen.getByRole("button", { name: "Menú de usuario" }));

    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByText("Preferencias")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Salir" })[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    });
  });
});
