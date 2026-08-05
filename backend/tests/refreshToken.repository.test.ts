import "./setup";
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { userRepository } from "../src/repositories/user.repository";
import { refreshTokenRepository } from "../src/repositories/refreshToken.repository";

describe("refreshTokenRepository", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: "rt-repo-test" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createTestUser(emailSuffix: string) {
    return userRepository.create({
      email: `rt-repo-test-${emailSuffix}@example.com`,
      passwordHash: "hashed",
      firstName: "RT",
      lastName: "Test",
    });
  }

  it("creates and finds a refresh token by its value", async () => {
    const user = await createTestUser("create-find");
    const expiresAt = new Date(Date.now() + 60_000);

    await refreshTokenRepository.create(user.id, "token-abc-123", expiresAt);

    const found = await refreshTokenRepository.findByToken("token-abc-123");
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);
  });

  it("deletes a refresh token by its value", async () => {
    const user = await createTestUser("delete");
    await refreshTokenRepository.create(user.id, "token-to-delete", new Date(Date.now() + 60_000));

    await refreshTokenRepository.deleteByToken("token-to-delete");

    const found = await refreshTokenRepository.findByToken("token-to-delete");
    expect(found).toBeNull();
  });

  it("deletes all refresh tokens for a user", async () => {
    const user = await createTestUser("delete-all");
    await refreshTokenRepository.create(user.id, "token-1", new Date(Date.now() + 60_000));
    await refreshTokenRepository.create(user.id, "token-2", new Date(Date.now() + 60_000));

    await refreshTokenRepository.deleteAllForUser(user.id);

    const remaining = await prisma.refreshToken.count({ where: { userId: user.id } });
    expect(remaining).toBe(0);
  });

  it("cascades deletion when the owning user is deleted", async () => {
    const user = await createTestUser("cascade");
    await refreshTokenRepository.create(user.id, "token-cascade", new Date(Date.now() + 60_000));

    await prisma.user.delete({ where: { id: user.id } });

    const found = await refreshTokenRepository.findByToken("token-cascade");
    expect(found).toBeNull();
  });
});
