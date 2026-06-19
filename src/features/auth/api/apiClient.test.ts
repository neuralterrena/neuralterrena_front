import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./apiClient";
import { authService } from "../model/authService";

describe("apiClient", () => {
  beforeEach(() => {
    authService.clearSession();
    localStorage.clear();
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8080/api/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("adds the access token to backend requests", async () => {
    const session = await authService.login({ password: "admin", username: "admin" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await apiClient.get("http://localhost:8080/api/terrain");

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBe(`Bearer ${session.tokens.accessToken}`);
  });

  it("refreshes the access token and retries once after a 401", async () => {
    const session = await authService.login({ password: "admin", username: "admin" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await apiClient.get("http://localhost:8080/api/terrain");

    const firstHeaders = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    const secondHeaders = new Headers(fetchSpy.mock.calls[1]?.[1]?.headers);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(firstHeaders.get("Authorization")).toBe(`Bearer ${session.tokens.accessToken}`);
    expect(secondHeaders.get("Authorization")).toMatch(/^Bearer /);
    expect(secondHeaders.get("Authorization")).not.toBe(`Bearer ${session.tokens.accessToken}`);
    expect(authService.getAccessToken()).not.toBe(session.tokens.accessToken);
  });
});
