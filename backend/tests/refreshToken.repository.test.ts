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

  // Callers are expected to store a hash of the token, not the raw value --
  // the repository itself is storage-format agnostic, so these tests use
  // opaque string stand-ins to exercise that behavior without depending on
  // the specific hash function.
  it("creates and finds a refresh token by its stored value", async () => {
    const user = await createTestUser("create-find");
    const expiresAt = new Date(Date.now() + 60_000);

    await refreshTokenRepository.create(user.id, "hash-abc-123", expiresAt);

    const found = await refreshTokenRepository.findByToken("hash-abc-123");
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);
  });

  it("deletes a refresh token by its stored value", async () => {
    const user = await createTestUser("delete");
    await refreshTokenRepository.create(user.id, "hash-to-delete", new Date(Date.now() + 60_000));

    await refreshTokenRepository.deleteByToken("hash-to-delete");

    const found = await refreshTokenRepository.findByToken("hash-to-delete");
    expect(found).toBeNull();
  });

  it("deletes all refresh tokens for a user", async () => {
    const user = await createTestUser("delete-all");
    await refreshTokenRepository.create(user.id, "hash-1", new Date(Date.now() + 60_000));
    await refreshTokenRepository.create(user.id, "hash-2", new Date(Date.now() + 60_000));

    await refreshTokenRepository.deleteAllForUser(user.id);

    const remaining = await prisma.refreshToken.count({ where: { userId: user.id } });
    expect(remaining).toBe(0);
  });

  it("cascades deletion when the owning user is deleted", async () => {
    const user = await createTestUser("cascade");
    await refreshTokenRepository.create(user.id, "hash-cascade", new Date(Date.now() + 60_000));

    await prisma.user.delete({ where: { id: user.id } });

    const found = await refreshTokenRepository.findByToken("hash-cascade");
    expect(found).toBeNull();
  });

  describe("consumeToken", () => {
    it("atomically deletes the token and returns the deleted row", async () => {
      const user = await createTestUser("consume");
      const expiresAt = new Date(Date.now() + 60_000);
      await refreshTokenRepository.create(user.id, "hash-consume", expiresAt);

      const consumed = await refreshTokenRepository.consumeToken("hash-consume");

      expect(consumed?.userId).toBe(user.id);
      const found = await refreshTokenRepository.findByToken("hash-consume");
      expect(found).toBeNull();
    });

    it("returns null when the token does not exist", async () => {
      const consumed = await refreshTokenRepository.consumeToken("hash-does-not-exist");
      expect(consumed).toBeNull();
    });

    it("returns null on a second consume of an already-consumed token", async () => {
      const user = await createTestUser("consume-twice");
      await refreshTokenRepository.create(
        user.id,
        "hash-consume-twice",
        new Date(Date.now() + 60_000),
      );

      const first = await refreshTokenRepository.consumeToken("hash-consume-twice");
      const second = await refreshTokenRepository.consumeToken("hash-consume-twice");

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it("under concurrent calls for the same token, exactly one caller receives a non-null result", async () => {
      const user = await createTestUser("consume-concurrent");
      await refreshTokenRepository.create(
        user.id,
        "hash-consume-concurrent",
        new Date(Date.now() + 60_000),
      );

      const attempts = await Promise.all(
        Array.from({ length: 10 }, () =>
          refreshTokenRepository.consumeToken("hash-consume-concurrent"),
        ),
      );

      const successes = attempts.filter((result) => result !== null);
      expect(successes).toHaveLength(1);
    });
  });
});
