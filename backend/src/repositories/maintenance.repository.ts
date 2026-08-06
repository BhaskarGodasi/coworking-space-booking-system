import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

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
        startTime: { lt: endTime },
        endTime: { gt: startTime },
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

  delete(id: string, client: PrismaClientOrTx = prisma) {
    return client.maintenance.delete({ where: { id } });
  },
};
