import "./setup";
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";

describe("Prisma connection", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("connects to the database and can run a raw query", async () => {
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 AS result`;
    expect(result[0].result).toBe(1);
  });

  it("can reach the User table", async () => {
    const count = await prisma.user.count();
    expect(typeof count).toBe("number");
  });
});
