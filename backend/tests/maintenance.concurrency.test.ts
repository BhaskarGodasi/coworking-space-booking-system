import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { maintenanceService } from "../src/services/maintenance.service";
import { bookingService } from "../src/services/booking.service";
import { ConflictError } from "../src/errors/AppError";

/**
 * System Architecture v1.1's Concurrency Architecture applies the same
 * Space-row lock (SELECT ... FOR UPDATE inside prisma.$transaction) to
 * both Booking and Maintenance inserts, and step 3 explicitly checks both
 * tables for overlaps. These tests verify the three pairings named in the
 * Phase 5 review scope: maintenance vs booking, maintenance vs
 * maintenance, and booking approval vs a concurrently-created maintenance
 * window.
 */
describe("Maintenance concurrency", () => {
  let spaceId: string;
  let userIds: string[];

  beforeAll(async () => {
    const space = await prisma.space.create({
      data: { name: "maintenance-concurrency-test-space", type: "MEETING_ROOM", capacity: 4, amenities: [] },
    });
    spaceId = space.id;

    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `maintenance-concurrency-test-user-${i}@example.com`,
            passwordHash: "hashed",
            firstName: "Stress",
            lastName: `User${i}`,
          },
        }),
      ),
    );
    userIds = users.map((u) => u.id);
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { spaceId } });
    await prisma.maintenance.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  function futureIso(daysAhead: number, hour: number) {
    const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  it("maintenance vs maintenance: 10 simultaneous requests for the identical window yield exactly 1 row", async () => {
    const startTime = futureIso(20, 9);
    const endTime = futureIso(20, 10);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        maintenanceService.create({ spaceId, startTime, endTime, reason: `Attempt ${i}` }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejectedWithConflict = results.filter(
      (r) => r.status === "rejected" && (r as PromiseRejectedResult).reason instanceof ConflictError,
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejectedWithConflict).toHaveLength(9);

    const rowCount = await prisma.maintenance.count({
      where: { spaceId, startTime: new Date(startTime), endTime: new Date(endTime) },
    });
    expect(rowCount).toBe(1);
  });

  it("maintenance vs booking: simultaneous create() and maintenanceService.create() for the same slot yield exactly 1 winner", async () => {
    const startTime = futureIso(21, 9);
    const endTime = futureIso(21, 10);

    const results = await Promise.allSettled([
      ...userIds.slice(0, 5).map((userId) => bookingService.create(userId, { spaceId, startTime, endTime } as never)),
      ...Array.from({ length: 5 }, (_, i) =>
        maintenanceService.create({ spaceId, startTime, endTime, reason: `Maintenance ${i}` }),
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    // Exactly one of the ten concurrent attempts -- whether a booking or a
    // maintenance window -- can win the slot; the Space-row lock plus the
    // cross-table overlap check guarantee this regardless of which type
    // of request happens to acquire the lock first.
    expect(fulfilled).toHaveLength(1);

    const bookingCount = await prisma.booking.count({
      where: { spaceId, startTime: new Date(startTime), endTime: new Date(endTime) },
    });
    const maintenanceCount = await prisma.maintenance.count({
      where: { spaceId, startTime: new Date(startTime), endTime: new Date(endTime) },
    });
    expect(bookingCount + maintenanceCount).toBe(1);
  });

  it("booking approval vs a concurrent maintenance-window creation for the same space: no overlapping active pair results", async () => {
    // A PENDING booking exists for 09:00-10:00. Concurrently: the booking
    // is approved, and several attempts are made to create a maintenance
    // window at 09:30-10:30 (overlapping the booking's range). Because
    // both approve() and maintenanceService.create() acquire the same
    // Space-row lock, they cannot interleave -- either the booking
    // becomes APPROVED first (and every maintenance attempt subsequently
    // sees it as an active, blocking booking and 409s), or a maintenance
    // window is inserted first setting up a genuinely different scenario.
    // Either way, the system must never end up with both an APPROVED
    // booking and an overlapping maintenance window coexisting.
    const booking = await bookingService.create(userIds[0], {
      spaceId,
      startTime: futureIso(22, 9),
      endTime: futureIso(22, 10),
    });

    const results = await Promise.allSettled([
      bookingService.approve(booking.id),
      ...Array.from({ length: 4 }, (_, i) =>
        maintenanceService.create({
          spaceId,
          startTime: futureIso(22, 9),
          endTime: futureIso(22, 10),
          reason: `Concurrent attempt ${i}`,
        }),
      ),
    ]);

    const approveResult = results[0];
    const maintenanceResults = results.slice(1);

    expect(approveResult.status).toBe("fulfilled");
    // The booking is active (PENDING then APPROVED) throughout, so every
    // maintenance attempt for the identical overlapping range must fail.
    maintenanceResults.forEach((r) => {
      expect(r.status).toBe("rejected");
    });

    const finalBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(finalBooking?.status).toBe("APPROVED");

    const maintenanceCount = await prisma.maintenance.count({
      where: {
        spaceId,
        startTime: { lt: new Date(futureIso(22, 10)) },
        endTime: { gt: new Date(futureIso(22, 9)) },
      },
    });
    expect(maintenanceCount).toBe(0);
  });
});
