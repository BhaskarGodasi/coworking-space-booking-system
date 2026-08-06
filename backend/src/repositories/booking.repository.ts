import { PrismaClient, Prisma, BookingStatus } from "@prisma/client";
import { prisma } from "./prisma";

export interface CreateBookingInput {
  userId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "APPROVED"];

export const bookingRepository = {
  /**
   * Locks the parent Space row for the duration of the enclosing
   * transaction, per System Architecture v1.1 Concurrency Architecture
   * step 2. Concurrent transactions targeting the same space serialize on
   * this lock; the second caller blocks until the first commits or rolls
   * back, at which point it re-evaluates the overlap check against the
   * first caller's now-committed state.
   */
  lockSpaceForUpdate(spaceId: string, tx: Prisma.TransactionClient) {
    return tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Space" WHERE "id" = ${spaceId} FOR UPDATE`;
  },

  /**
   * Step 3 of the documented concurrency algorithm: finds any PENDING or
   * APPROVED booking for the space whose range overlaps the requested
   * range. Two ranges [aStart, aEnd) and [bStart, bEnd) overlap iff
   * aStart < bEnd AND bStart < aEnd.
   */
  findOverlapping(
    spaceId: string,
    startTime: Date,
    endTime: Date,
    tx: Prisma.TransactionClient,
    excludeBookingId?: string,
  ) {
    return tx.booking.findFirst({
      where: {
        spaceId,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });
  },

  create(input: CreateBookingInput, tx: Prisma.TransactionClient) {
    return tx.booking.create({
      data: {
        userId: input.userId,
        spaceId: input.spaceId,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });
  },

  findById(id: string, client: PrismaClientOrTx = prisma) {
    return client.booking.findUnique({ where: { id } });
  },

  findManyByUser(userId: string, client: PrismaClientOrTx = prisma) {
    return client.booking.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
    });
  },

  findMany(filter: { status?: BookingStatus }, client: PrismaClientOrTx = prisma) {
    return client.booking.findMany({
      where: filter.status ? { status: filter.status } : {},
      orderBy: { startTime: "desc" },
    });
  },

  /**
   * Atomic conditional transition: the WHERE clause re-asserts the
   * expected current status as part of the same UPDATE statement, so the
   * read-then-write is a single atomic operation at the database level.
   * Of two concurrent calls attempting to transition the same booking out
   * of the same expected status, at most one can ever see count === 1;
   * the other observes count === 0, meaning the row had already moved on
   * by the time its UPDATE ran, and must not treat its own call as
   * having succeeded.
   */
  transitionStatus(
    id: string,
    fromStatuses: BookingStatus[],
    toStatus: BookingStatus,
    tx: PrismaClientOrTx,
  ) {
    return tx.booking.updateMany({
      where: { id, status: { in: fromStatuses } },
      data: { status: toStatus },
    });
  },

  /**
   * Auto-reject step of the Admin Approval flow: within the same
   * transaction that approves one booking, finds every other PENDING
   * booking for the same space overlapping the just-approved range and
   * flips them to REJECTED.
   */
  rejectOverlappingPending(
    spaceId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.booking.updateMany({
      where: {
        spaceId,
        status: "PENDING",
        id: { not: excludeBookingId },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      data: { status: "REJECTED" },
    });
  },
};
