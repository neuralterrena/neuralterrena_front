import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { useAuth } from "../../../app/providers/useAuth";
import { AuthError } from "../services/authTypes";

vi.mock("../../../app/providers/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("LoginPage", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      isAuthenticating: false,
      login: mockLogin,
    });
  });

  it("renders the login form correctly", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("Clave")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("enables submit button when both fields are filled", () => {
    render(<LoginPage />);
    const usernameInput = screen.getByLabelText("Usuario");
    const passwordInput = screen.getByLabelText("Clave");
    const submitBtn = screen.getByRole("button", { name: "Entrar" });

    expect(submitBtn).toBeDisabled();

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(passwordInput, { target: { value: "password123" } });
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls login with trimmed username and password on submit", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: " testuser " } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(mockLogin).toHaveBeenCalledWith({ username: "testuser", password: "password123" });
  });

  it("shows error message when login fails with AuthError", async () => {
    mockLogin.mockRejectedValueOnce(new AuthError("Invalid credentials"));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "wrongpassword" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
  });

  it("shows generic error message when login fails with non-AuthError", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Network error"));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "wrongpassword" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo validar la sesión.");
    });
  });

  it("disables submit button and shows 'Validando' when isAuthenticating is true", () => {
    (useAuth as any).mockReturnValue({
      isAuthenticating: true,
      login: mockLogin,
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("Clave"), { target: { value: "password123" } });

    const submitBtn = screen.getByRole("button", { name: "Validando" });
    expect(submitBtn).toBeDisabled();
  });

  it("toggles password visibility", () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText("Clave");
    const toggleBtn = screen.getByRole("button", { name: "Mostrar clave" });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar clave" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar clave" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
