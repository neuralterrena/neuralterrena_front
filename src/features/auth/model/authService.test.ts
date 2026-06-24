import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "./authService";
import { AuthError } from "./authTypes";

const createAccessToken = (overrides: Record<string, unknown> = {}) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      email: "operator@neuralterrena.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: "Operator",
      roles: ["operator"],
      sub: "usr_123",
      ...overrides,
    }),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

  return `${header}.${payload}.signature`;
};

describe("authService", () => {
  beforeEach(() => {
    authService.clearSession();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("stores the access token only in memory after login", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access: createAccessToken() }), {
        status: 200,
      }),
    );

    const session = await authService.login({ email: "operator@neuralterrena.com", password: "secret" });

    expect(session.user.email).toBe("operator@neuralterrena.com");
    expect(session.accessToken.split(".")).toHaveLength(3);
    expect(authService.getAccessToken()).toBe(session.accessToken);
    expect(window.localStorage.length).toBe(0);

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(init?.credentials).toBe("include");
  });

  it("maps a 401 login response to invalid credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), {
        status: 401,
      }),
    );

    await expect(authService.login({ email: "operator@neuralterrena.com", password: "wrong" })).rejects.toMatchObject({
      code: "auth.invalidCredentials",
    } satisfies Partial<AuthError>);
  });

  it("restores a session through the refresh endpoint", async () => {
    const firstToken = createAccessToken({ sub: "usr_bootstrap" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access: firstToken }), {
        status: 200,
      }),
    );

    const restoredSession = await authService.bootstrapSession();

    expect(restoredSession?.accessToken).toBe(firstToken);
    expect(authService.getSession()?.user.id).toBe("usr_bootstrap");
    expect(authService.getStatus()).toBe("authenticated");
  });

  it("clears the session when refresh fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    const restoredSession = await authService.bootstrapSession();

    expect(restoredSession).toBeNull();
    expect(authService.getSession()).toBeNull();
    expect(authService.getStatus()).toBe("anonymous");
  });

  it("clears local state even when logout fails on the backend", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: createAccessToken() }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "failure" }), { status: 500 }));

    await authService.login({ email: "operator@neuralterrena.com", password: "secret" });
    await authService.logout();

    expect(authService.getSession()).toBeNull();
    expect(authService.getStatus()).toBe("anonymous");
  });
});
