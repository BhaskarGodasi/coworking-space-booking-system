import { describe, it, expect } from "vitest";
import { RegisterDTO, LoginDTO } from "../src/dtos/auth.dto";

describe("RegisterDTO", () => {
  it("accepts a valid registration payload", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(true);
  });

  it("lowercases the email", () => {
    const result = RegisterDTO.safeParse({
      email: "User@Example.COM",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects an invalid email format", () => {
    const result = RegisterDTO.safeParse({
      email: "not-an-email",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "short",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password with letters only (no number)", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "onlyletters",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password with numbers only (no letter)", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "12345678",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a password with both letters and numbers", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a payload with an empty first or last name", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a client-supplied role field", () => {
    const result = RegisterDTO.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      role: "ADMIN",
    });

    expect(result.success).toBe(false);
  });
});

describe("LoginDTO", () => {
  it("accepts a valid login payload", () => {
    const result = LoginDTO.safeParse({
      email: "user@example.com",
      password: "anything",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = LoginDTO.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = LoginDTO.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });
});
