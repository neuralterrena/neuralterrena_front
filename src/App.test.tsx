import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { authService } from "@/features/auth/model/authService";

vi.mock("@/features/map", () => ({
  MapPage: () => <h1>Visor operativo</h1>,
}));

const createAccessToken = (
  subject: string,
  email = "operator@neuralterrena.com",
) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      email,
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: "Operator",
      roles: ["operator"],
      sub: subject,
    }),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

  return `${header}.${payload}.signature`;
};

describe("App", () => {
  beforeEach(() => {
    authService.clearSession();
    localStorage.clear();
    document.documentElement.lang = "es";
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    window.history.replaceState({}, "", "/login");
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the login screen after the silent refresh fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toBeInTheDocument();
    expect(screen.getByLabelText("Clave")).toBeInTheDocument();
  });

  it("authenticates and routes into the private console", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access: createAccessToken("usr_console") }),
          { status: 200 },
        ),
      );

    render(<App />);

    fireEvent.change(await screen.findByLabelText("Correo"), {
      target: { value: "operator@neuralterrena.com" },
    });
    fireEvent.change(screen.getByLabelText("Clave"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Visor operativo" }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Mapa" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("button", { name: "Aumentar tipografía" }),
    ).toBeInTheDocument();
  });

  it("shows a concise error for invalid credentials", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Invalid credentials" }), {
          status: 401,
        }),
      );

    render(<App />);

    fireEvent.change(await screen.findByLabelText("Correo"), {
      target: { value: "operator@neuralterrena.com" },
    });
    fireEvent.change(screen.getByLabelText("Clave"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid credentials",
      );
    });
  });

  it("switches the interface language to English", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    render(<App />);

    await screen.findByRole("heading", { name: "Iniciar sesión" });
    fireEvent.click(screen.getByRole("button", { name: "Inglés" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches the interface theme to dark", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    render(<App />);

    await screen.findByRole("heading", { name: "Iniciar sesión" });
    fireEvent.click(screen.getByRole("button", { name: "Oscuro" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    expect(localStorage.getItem("nt.theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(
      screen
        .getAllByAltText("neural terrena")
        .map((logo) => logo.getAttribute("src")),
    ).toContain("/brand/NT-logo-white-horizontal.png");
  });

  it("restores the authenticated session on load using refresh", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ access: createAccessToken("usr_bootstrap") }),
        {
          status: 200,
        },
      ),
    );

    window.history.replaceState({}, "", "/");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Visor operativo" }),
      ).toBeInTheDocument();
    });
  });

  it("navigates to forgot password and submits the reset request", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "ok" }), { status: 200 }),
      );

    render(<App />);

    fireEvent.click(
      await screen.findByRole("link", { name: "¿Olvidaste tu clave?" }),
    );
    fireEvent.change(await screen.findByLabelText("Correo"), {
      target: { value: "operator@neuralterrena.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Si la cuenta existe, se ha enviado un correo de recuperación.",
      );
    });

    const [, init] = fetchSpy.mock.calls[1] ?? [];
    expect(init?.method).toBe("POST");
  });

  it("submits the password reset confirmation screen", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "ok" }), { status: 200 }),
      );

    window.history.replaceState(
      {},
      "",
      "/reset-password?uid=uid-1&token=token-1",
    );
    render(<App />);

    fireEvent.change(await screen.findByLabelText("Nueva clave"), {
      target: { value: "new-secret" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar clave"), {
      target: { value: "new-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar clave" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "La clave se actualizó. Inicia sesión con las nuevas credenciales.",
      );
    });
  });

  it("opens the user menu in the dashboard and signs out from there", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access: createAccessToken("usr_refresh") }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: "Logout completed successfully." }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    window.history.replaceState({}, "", "/");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Visor operativo" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Menú de usuario" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Salir" })[0]);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Iniciar sesión" }),
      ).toBeInTheDocument();
    });
  });
});
