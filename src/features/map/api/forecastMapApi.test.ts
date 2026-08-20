import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../auth/model/authService";
import { buildRasterTileUrl, getModels, getRuns } from "./forecastMapApi";

const createAccessToken = () => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ email: "operator@neuralterrena.com", exp: Math.floor(Date.now() / 1000) + 3600, sub: "usr_1" })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return `${header}.${payload}.signature`;
};

afterEach(() => { authService.clearSession(); vi.restoreAllMocks(); });

describe("buildRasterTileUrl", () => {
  it("uses the TiTiler path and encodes selection without exposing a token", () => {
    const url = buildRasterTileUrl("https://forecast.example.test", "icon-eu", "2026081500", "temperature_2m", 3, { min: 250, max: 310 }, "viridis");
    expect(url).toContain("/v1/models/icon-eu/zarr/tiles/WebMercatorQuad/{z}/{x}/{y}.png");
    expect(url).toContain("sel=forecast_hour%3D3");
    expect(url).toContain("rescale=250%2C310");
    expect(url).not.toContain("token");
  });
});

describe("forecast model API", () => {
  it("discovers models and authenticates model runs while ordering cycles newest first", async () => {
    const accessToken = createAccessToken();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: accessToken }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: ["gfs", { id: "icon-eu", label: "ICON Europa" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ runs: {
        "2026081500": { created_at: "2026-08-15T00:00:00Z", forecast_hours: [3, 0], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"] } },
        "2026081512": { created_at: "2026-08-15T12:00:00Z", forecast_hours: [0], layers: ["temperature_2m"], forecast_layers: { "0": ["temperature_2m"] } },
      } }), { status: 200 }));
    await authService.login({ email: "operator@neuralterrena.com", password: "secret" });
    await expect(getModels("https://forecast.example.test")).resolves.toEqual([
      { id: "gfs" },
      { id: "icon-eu", label: "ICON Europa" },
    ]);
    const runs = await getRuns("https://forecast.example.test", "gfs");
    const [, init] = fetchSpy.mock.calls.at(-1) ?? [];
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${accessToken}`);
    const [request] = fetchSpy.mock.calls.at(-1) ?? [];
    const requestUrl = request instanceof Request ? request.url : request instanceof URL ? request.toString() : request;
    expect(requestUrl).toContain("/v1/models/gfs/runs");
    expect(runs.map(([id]) => id)).toEqual(["2026081512", "2026081500"]);
    expect(runs[1][1].forecast_hours).toEqual([0, 3]);
  });
});
