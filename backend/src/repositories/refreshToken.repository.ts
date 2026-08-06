import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

const RECORD_NOT_FOUND = "P2025";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export const refreshTokenRepository = {
  create(userId: string, token: string, expiresAt: Date, client: PrismaClientOrTx = prisma) {
    return client.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  },

  findByToken(token: string, client: PrismaClientOrTx = prisma) {
    return client.refreshToken.findUnique({ where: { token } });
  },

  deleteByToken(token: string) {
    return prisma.refreshToken.deleteMany({ where: { token } });
  },

  /**
   * Atomically deletes the token and returns the deleted row, or null if it
   * was already consumed/never existed. Only one concurrent caller for the
   * same token value can ever receive a non-null result.
   */
  async consumeToken(token: string, client: PrismaClientOrTx = prisma) {
    try {
      return await client.refreshToken.delete({ where: { token } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === RECORD_NOT_FOUND) {
        return null;
      }
      throw err;
    }
  },

  deleteAllForUser(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },
};
