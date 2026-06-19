import { authSessionStore } from "./authSessionStore";
import { authStorage } from "./authStorage";
import { authService } from "./authService";
import { AuthError } from "./authTypes";

describe("authService", () => {
  beforeEach(() => {
    authService.clearSession();
    localStorage.clear();
  });

  it("returns a JWT-shaped session for the local admin credentials", async () => {
    const session = await authService.login({ password: "admin", username: "admin" });
    const storedRefreshSession = authStorage.load();
    const storedPayload = localStorage.getItem(localStorage.key(0) ?? "");

    expect(session.user.username).toBe("admin");
    expect(session.tokens.tokenType).toBe("Bearer");
    expect(session.tokens.accessToken.split(".")).toHaveLength(3);
    expect(authService.getAccessToken()).toBe(session.tokens.accessToken);
    expect(storedRefreshSession?.refreshToken).toBeTruthy();
    expect(storedPayload).not.toContain(session.tokens.accessToken);
  });

  it("rejects invalid local credentials", async () => {
    await expect(authService.login({ password: "wrong", username: "admin" })).rejects.toThrow(AuthError);
  });

  it("restores a fresh access token from the stored refresh token", async () => {
    const session = await authService.login({ password: "admin", username: "admin" });
    const storedRefreshToken = authStorage.load()?.refreshToken;

    authSessionStore.clear();

    const restoredSession = await authService.restoreSession();

    expect(storedRefreshToken).toBeTruthy();
    expect(restoredSession?.tokens.accessToken).toBeTruthy();
    expect(restoredSession?.tokens.accessToken).not.toBe(session.tokens.accessToken);
    expect(authStorage.load()?.refreshToken).toBe(storedRefreshToken);
  });
});
