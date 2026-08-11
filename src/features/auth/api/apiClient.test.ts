import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./apiClient";
import { authService } from "../model/authService";
import { registerUnauthorizedHandler } from "../model/authNavigation";

const createAccessToken = (subject: string) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      email: "operator@neuralterrena.com",
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

describe("apiClient", () => {
  beforeEach(() => {
    authService.clearSession();
    registerUnauthorizedHandler(null);
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080/api/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("adds the access token to backend requests", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: createAccessToken("usr_1") }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const session = await authService.login({ email: "operator@neuralterrena.com", password: "secret" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await apiClient.get("http://localhost:8080/api/protected-resource");

    const [, init] = fetchSpy.mock.calls.at(-1) ?? [];
    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBe(`Bearer ${session.accessToken}`);
  });

  it("refreshes the access token and retries once after a 401", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: createAccessToken("usr_login") }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: createAccessToken("usr_refresh") }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const session = await authService.login({ email: "operator@neuralterrena.com", password: "secret" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await apiClient.get("http://localhost:8080/api/protected-resource");

    const initialHeaders = new Headers(fetchSpy.mock.calls[1]?.[1]?.headers);
    const retriedHeaders = new Headers(fetchSpy.mock.calls[3]?.[1]?.headers);

    expect(initialHeaders.get("Authorization")).toBe(`Bearer ${session.accessToken}`);
    expect(retriedHeaders.get("Authorization")).toBe(`Bearer ${authService.getAccessToken()}`);
    expect(retriedHeaders.get("Authorization")).not.toBe(`Bearer ${session.accessToken}`);
  });

  it("clears the session and notifies unauthorized when refresh fails", async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: createAccessToken("usr_login") }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    await authService.login({ email: "operator@neuralterrena.com", password: "secret" });

    await expect(apiClient.get("http://localhost:8080/api/protected-resource")).rejects.toMatchObject({
      code: "auth.sessionExpired",
    });

    expect(authService.getSession()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
