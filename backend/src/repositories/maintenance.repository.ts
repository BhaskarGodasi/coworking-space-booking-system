import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { overlapsRange } from "../utils/overlap";

export interface CreateMaintenanceInput {
  spaceId: string;
  startTime: Date;
  endTime: Date;
  reason: string;
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export const maintenanceRepository = {
  /**
   * Step 3 of System Architecture v1.1's documented concurrency algorithm,
   * Maintenance side: finds any maintenance window for the space whose
   * range overlaps the requested range. Two ranges [aStart, aEnd) and
   * [bStart, bEnd) overlap iff aStart < bEnd AND bStart < aEnd.
   */
  findOverlapping(
    spaceId: string,
    startTime: Date,
    endTime: Date,
    tx: Prisma.TransactionClient,
    excludeMaintenanceId?: string,
  ) {
    return tx.maintenance.findFirst({
      where: {
        spaceId,
        ...overlapsRange(startTime, endTime),
        ...(excludeMaintenanceId ? { id: { not: excludeMaintenanceId } } : {}),
      },
    });
  },

  create(input: CreateMaintenanceInput, tx: Prisma.TransactionClient) {
    return tx.maintenance.create({
      data: {
        spaceId: input.spaceId,
        startTime: input.startTime,
        endTime: input.endTime,
        reason: input.reason,
      },
    });
  },

  findById(id: string, client: PrismaClientOrTx = prisma) {
    return client.maintenance.findUnique({ where: { id } });
  },

  findMany(filter: { spaceId?: string }, client: PrismaClientOrTx = prisma) {
    return client.maintenance.findMany({
      where: filter.spaceId ? { spaceId: filter.spaceId } : {},
      orderBy: { startTime: "desc" },
    });
  },

  /**
   * Atomic delete-and-return, mirroring refreshTokenRepository.consumeToken:
   * the delete itself is the existence check. Of two concurrent deletes for
   * the same id, only one can find a row to remove; the other observes
   * Prisma's P2025 (record not found) and returns null instead of throwing,
   * so a duplicate delete request is a clean no-op rather than an
   * unhandled 500.
   */
  async deleteIfExists(id: string, client: PrismaClientOrTx = prisma) {
    try {
      return await client.maintenance.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return null;
      }
      throw err;
    }
  },
};
