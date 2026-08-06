import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { bookingService } from "../src/services/booking.service";
import { ConflictError } from "../src/errors/AppError";

/**
 * Roadmap v1.1 Phase 4 marks this scenario CRITICAL: "Write a parallel
 * execution test hitting POST /bookings simultaneously for the exact same
 * time slot to mathematically guarantee only 1 request succeeds (201) and
 * others fail (409)." This file drives the service layer directly (rather
 * than through HTTP) with a higher concurrency count to stress the
 * SELECT ... FOR UPDATE lock described in System Architecture v1.1's
 * Concurrency Architecture section.
 */
describe("Booking concurrency (stress)", () => {
  let spaceId: string;
  let userIds: string[];

  beforeAll(async () => {
    const space = await prisma.space.create({
      data: { name: "booking-concurrency-test-space", type: "MEETING_ROOM", capacity: 4, amenities: [] },
    });
    spaceId = space.id;

    const users = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `booking-concurrency-test-user-${i}@example.com`,
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

  it("25 simultaneous requests for the identical slot yield exactly 1 booking row", async () => {
    const startTime = futureIso(30, 9);
    const endTime = futureIso(30, 10);

    const results = await Promise.allSettled(
      userIds.map((userId) => bookingService.create(userId, { spaceId, startTime, endTime } as never)),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejectedWithConflict = results.filter(
      (r) => r.status === "rejected" && (r as PromiseRejectedResult).reason instanceof ConflictError,
    );
    const rejectedOther = results.filter(
      (r) => r.status === "rejected" && !((r as PromiseRejectedResult).reason instanceof ConflictError),
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejectedWithConflict).toHaveLength(userIds.length - 1);
    expect(rejectedOther).toHaveLength(0);

    const rowCount = await prisma.booking.count({
      where: { spaceId, startTime: new Date(startTime), endTime: new Date(endTime) },
    });
    expect(rowCount).toBe(1);
  });

  it("repeated bursts each converge to exactly one winner (no accumulated duplicates)", async () => {
    for (let round = 0; round < 3; round += 1) {
      const startTime = futureIso(40 + round, 9);
      const endTime = futureIso(40 + round, 10);

      const results = await Promise.allSettled(
        userIds
          .slice(0, 10)
          .map((userId) => bookingService.create(userId, { spaceId, startTime, endTime } as never)),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      expect(fulfilled).toHaveLength(1);
    }

    const totalBookings = await prisma.booking.count({ where: { spaceId } });
    expect(totalBookings).toBe(3);
  });

  it(
    "documents a known gap: simultaneous approve+cancel on the same booking are not " +
      "mutually locked, unlike booking creation's Space-row lock",
    async () => {
      // System Architecture v1.1's Concurrency Architecture (SELECT ... FOR
      // UPDATE inside prisma.$transaction) is documented specifically for
      // booking CREATION locking the parent Space row -- it says nothing
      // about serializing concurrent lifecycle transitions (approve/
      // reject/cancel) against each other on the same Booking row. Neither
      // bookingService.approve() nor .cancel() takes any lock; both do an
      // unguarded findById-then-write. This test documents the resulting
      // behavior rather than asserting a guarantee the code does not
      // provide: both calls can read status PENDING before either writes,
      // so both may "succeed" from the caller's point of view, with
      // whichever write lands last silently winning.
      const startTime = futureIso(50, 9);
      const endTime = futureIso(50, 10);
      const booking = await bookingService.create(userIds[0], {
        spaceId,
        startTime,
        endTime,
      } as never);

      const results = await Promise.allSettled([
        bookingService.approve(booking.id),
        bookingService.cancel(booking.id, userIds[0]),
      ]);

      const final = await prisma.booking.findUnique({ where: { id: booking.id } });

      // The row is never left in a status outside the enum, and at least
      // one transition is always observed to complete -- that much the
      // current implementation does guarantee.
      expect(["APPROVED", "CANCELLED"]).toContain(final?.status);
      expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    },
  );
});
