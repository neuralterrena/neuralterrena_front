import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { authService } from "../../features/auth/services/authService";

const TestComponent = () => {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="is-ready">{String(auth.isReady)}</div>
      <div data-testid="is-authenticated">{String(auth.isAuthenticated)}</div>
      <div data-testid="is-authenticating">{String(auth.isAuthenticating)}</div>
      <div data-testid="username">{auth.session?.user?.username ?? "none"}</div>
      <button onClick={() => void auth.login({ username: "admin", password: "admin" })}>
        Login Valid
      </button>
      <button onClick={() => void auth.login({ username: "wrong", password: "password" }).catch(() => {})}>
        Login Invalid
      </button>
      <button onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    authService.clearSession();
    localStorage.clear();
  });

  it("initializes and becomes ready without an active session", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state before restoreSession completes
    expect(screen.getByTestId("is-ready")).toHaveTextContent("false");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");

    // Wait for restoreSession to finish
    await waitFor(() => {
      expect(screen.getByTestId("is-ready")).toHaveTextContent("true");
    });

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  it("handles successful login", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-ready")).toHaveTextContent("true");
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Login Valid"));

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("username")).toHaveTextContent("admin");
    expect(screen.getByTestId("is-authenticating")).toHaveTextContent("false");
  });

  it("handles failed login", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-ready")).toHaveTextContent("true");
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Login Invalid"));

    // Wait for the rejection and state to settle back to false
    await waitFor(() => {
      expect(screen.getByTestId("is-authenticating")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  it("handles logout", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-ready")).toHaveTextContent("true");
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Login Valid"));

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("Logout"));

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("username")).toHaveTextContent("none");
  });

  it("initializes with an existing session if one exists in authService", async () => {
    // Force a login beforehand to populate the session
    await authService.login({ username: "admin", password: "admin" });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // It should synchronously know about the session from authService.getSession()
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("username")).toHaveTextContent("admin");

    await waitFor(() => {
      expect(screen.getByTestId("is-ready")).toHaveTextContent("true");
    });
  });
});
