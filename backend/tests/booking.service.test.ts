import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { bookingService } from "../src/services/booking.service";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "../src/errors/AppError";

describe("bookingService", () => {
  let ownerId: string;
  let otherUserId: string;
  let spaceId: string;

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        email: "booking-svc-test-owner@example.com",
        passwordHash: "hashed",
        firstName: "Owner",
        lastName: "Test",
      },
    });
    ownerId = owner.id;

    const other = await prisma.user.create({
      data: {
        email: "booking-svc-test-other@example.com",
        passwordHash: "hashed",
        firstName: "Other",
        lastName: "Test",
      },
    });
    otherUserId = other.id;

    const space = await prisma.space.create({
      data: { name: "booking-svc-test-space", type: "DESK", capacity: 1, amenities: [] },
    });
    spaceId = space.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherUserId] } } });
    await prisma.$disconnect();
  });

  function futureIso(daysAhead: number, hour: number) {
    const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  it("creates a PENDING booking for a valid future slot", async () => {
    const booking = await bookingService.create(ownerId, {
      spaceId,
      startTime: futureIso(1, 9),
      endTime: futureIso(1, 10),
    });

    expect(booking.status).toBe("PENDING");
    expect(booking.userId).toBe(ownerId);
  });

  it("throws NotFoundError when the space does not exist", async () => {
    await expect(
      bookingService.create(ownerId, {
        spaceId: "00000000-0000-0000-0000-000000000000",
        startTime: futureIso(1, 9),
        endTime: futureIso(1, 10),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError on an overlapping booking for the same space", async () => {
    await bookingService.create(ownerId, {
      spaceId,
      startTime: futureIso(2, 9),
      endTime: futureIso(2, 10),
    });

    await expect(
      bookingService.create(otherUserId, {
        spaceId,
        startTime: futureIso(2, 9),
        endTime: futureIso(2, 10),
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("listOwn returns only the requesting user's bookings", async () => {
    await bookingService.create(ownerId, {
      spaceId,
      startTime: futureIso(3, 9),
      endTime: futureIso(3, 10),
    });
    await bookingService.create(otherUserId, {
      spaceId,
      startTime: futureIso(3, 11),
      endTime: futureIso(3, 12),
    });

    const ownerBookings = await bookingService.listOwn(ownerId);
    expect(ownerBookings).toHaveLength(1);
    expect(ownerBookings[0].userId).toBe(ownerId);
  });

  describe("cancel", () => {
    it("cancels the owner's own future PENDING booking", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(4, 9),
        endTime: futureIso(4, 10),
      });

      const cancelled = await bookingService.cancel(booking.id, ownerId);
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("throws ForbiddenError when a non-owner attempts to cancel", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(5, 9),
        endTime: futureIso(5, 10),
      });

      await expect(bookingService.cancel(booking.id, otherUserId)).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError for a non-existent booking", async () => {
      await expect(
        bookingService.cancel("00000000-0000-0000-0000-000000000000", ownerId),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when cancelling an already-cancelled booking", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(6, 9),
        endTime: futureIso(6, 10),
      });
      await bookingService.cancel(booking.id, ownerId);

      await expect(bookingService.cancel(booking.id, ownerId)).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when cancelling a REJECTED booking", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(7, 9),
        endTime: futureIso(7, 10),
      });
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "REJECTED" } });

      await expect(bookingService.cancel(booking.id, ownerId)).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when the booking's start time has already passed", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: ownerId,
          spaceId,
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          endTime: new Date(Date.now() - 30 * 60 * 1000),
          status: "PENDING",
        },
      });

      await expect(bookingService.cancel(booking.id, ownerId)).rejects.toThrow(ValidationError);
    });
  });

  describe("approve / reject", () => {
    it("approves a PENDING booking", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(8, 9),
        endTime: futureIso(8, 10),
      });

      const approved = await bookingService.approve(booking.id);
      expect(approved.status).toBe("APPROVED");
    });

    it("auto-rejects overlapping PENDING bookings for the same space on approval", async () => {
      const target = await prisma.booking.create({
        data: {
          userId: ownerId,
          spaceId,
          startTime: new Date(futureIso(9, 9)),
          endTime: new Date(futureIso(9, 11)),
          status: "PENDING",
        },
      });
      const overlapping = await prisma.booking.create({
        data: {
          userId: otherUserId,
          spaceId,
          startTime: new Date(futureIso(9, 10)),
          endTime: new Date(futureIso(9, 12)),
          status: "PENDING",
        },
      });
      const unrelated = await prisma.booking.create({
        data: {
          userId: otherUserId,
          spaceId,
          startTime: new Date(futureIso(9, 13)),
          endTime: new Date(futureIso(9, 14)),
          status: "PENDING",
        },
      });

      await bookingService.approve(target.id);

      const overlappingAfter = await prisma.booking.findUnique({ where: { id: overlapping.id } });
      const unrelatedAfter = await prisma.booking.findUnique({ where: { id: unrelated.id } });

      expect(overlappingAfter?.status).toBe("REJECTED");
      expect(unrelatedAfter?.status).toBe("PENDING");
    });

    it("throws ValidationError when approving a non-PENDING booking", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(10, 9),
        endTime: futureIso(10, 10),
      });
      await bookingService.approve(booking.id);

      await expect(bookingService.approve(booking.id)).rejects.toThrow(ValidationError);
    });

    it("rejects a PENDING booking", async () => {
      const booking = await bookingService.create(ownerId, {
        spaceId,
        startTime: futureIso(11, 9),
        endTime: futureIso(11, 10),
      });

      const rejected = await bookingService.reject(booking.id);
      expect(rejected.status).toBe("REJECTED");
    });

    it("throws NotFoundError when approving a non-existent booking", async () => {
      await expect(bookingService.approve("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
