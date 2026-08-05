import "./setup";
import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
} from "../src/utils/jwt.utils";

describe("jwt.utils", () => {
  it("signs an access token that can be verified back to the same payload", () => {
    const token = signAccessToken({ userId: "user-1", role: "MEMBER" });
    const payload = verifyAccessToken(token);

    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe("MEMBER");
  });

  it("throws when verifying a tampered token", () => {
    const token = signAccessToken({ userId: "user-1", role: "MEMBER" });
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");

    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("generates unique, sufficiently long opaque refresh tokens", () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(64);
  });

  it("computes a refresh token expiry in the future", () => {
    const expiry = refreshTokenExpiryDate();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});
