import "./setup";
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { userRepository } from "../src/repositories/user.repository";

describe("userRepository", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: "user-repo-test" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user defaulted to the MEMBER role", async () => {
    const user = await userRepository.create({
      email: "user-repo-test-create@example.com",
      passwordHash: "hashed",
      firstName: "Repo",
      lastName: "Test",
    });

    expect(user.id).toBeDefined();
    expect(user.role).toBe("MEMBER");
    expect(user.isActive).toBe(true);
  });

  it("finds a user by email", async () => {
    await userRepository.create({
      email: "user-repo-test-find@example.com",
      passwordHash: "hashed",
      firstName: "Repo",
      lastName: "Test",
    });

    const found = await userRepository.findByEmail("user-repo-test-find@example.com");
    expect(found).not.toBeNull();
    expect(found?.email).toBe("user-repo-test-find@example.com");
  });

  it("finds a user by id", async () => {
    const created = await userRepository.create({
      email: "user-repo-test-findbyid@example.com",
      passwordHash: "hashed",
      firstName: "Repo",
      lastName: "Test",
    });

    const found = await userRepository.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it("returns null for a non-existent email", async () => {
    const found = await userRepository.findByEmail("user-repo-test-does-not-exist@example.com");
    expect(found).toBeNull();
  });
});
