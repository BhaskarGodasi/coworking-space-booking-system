import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../src/utils/password";

describe("password utils", () => {
  it("hashes a password to a value different from the plaintext", async () => {
    const hash = await hashPassword("password123");
    expect(hash).not.toBe("password123");
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("password123");
    const matches = await comparePassword("password123", hash);
    expect(matches).toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("password123");
    const matches = await comparePassword("wrong-password", hash);
    expect(matches).toBe(false);
  });
});
