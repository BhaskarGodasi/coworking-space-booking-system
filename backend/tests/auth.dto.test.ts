import { describe, it, expect } from "vitest";
import { RegisterDto, LoginDto } from "../src/dtos/auth.dto";

describe("RegisterDto", () => {
  it("accepts a valid registration payload", () => {
    const result = RegisterDto.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(true);
  });

  it("lowercases the email", () => {
    const result = RegisterDto.safeParse({
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
    const result = RegisterDto.safeParse({
      email: "not-an-email",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = RegisterDto.safeParse({
      email: "user@example.com",
      password: "short",
      firstName: "Jane",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a payload with an empty first or last name", () => {
    const result = RegisterDto.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a client-supplied role field", () => {
    const result = RegisterDto.safeParse({
      email: "user@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      role: "ADMIN",
    });

    expect(result.success).toBe(false);
  });
});

describe("LoginDto", () => {
  it("accepts a valid login payload", () => {
    const result = LoginDto.safeParse({
      email: "user@example.com",
      password: "anything",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = LoginDto.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = LoginDto.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });
});
