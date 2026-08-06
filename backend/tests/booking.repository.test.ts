import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { bookingRepository } from "../src/repositories/booking.repository";

describe("bookingRepository", () => {
  let userId: string;
  let spaceId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: "booking-repo-test-user@example.com",
        passwordHash: "hashed",
        firstName: "Repo",
        lastName: "Test",
      },
    });
    userId = user.id;

    const space = await prisma.space.create({
      data: { name: "booking-repo-test-space", type: "DESK", capacity: 1, amenities: [] },
    });
    spaceId = space.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  function slot(startHour: number, endHour: number) {
    const day = "2026-09-01";
    return {
      startTime: new Date(`${day}T${String(startHour).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`${day}T${String(endHour).padStart(2, "0")}:00:00.000Z`),
    };
  }

  it("creates a booking defaulted to PENDING", async () => {
    const { startTime, endTime } = slot(9, 10);

    const booking = await prisma.$transaction((tx) =>
      bookingRepository.create({ userId, spaceId, startTime, endTime }, tx),
    );

    expect(booking.status).toBe("PENDING");
    expect(booking.userId).toBe(userId);
  });

  it("lockSpaceForUpdate returns the space row", async () => {
    const rows = await prisma.$transaction((tx) => bookingRepository.lockSpaceForUpdate(spaceId, tx));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(spaceId);
  });

  describe("findOverlapping", () => {
    it("returns null when no booking exists for the space", async () => {
      const { startTime, endTime } = slot(9, 10);
      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).toBeNull();
    });

    it("detects an exact-match overlap against a PENDING booking", async () => {
      const { startTime, endTime } = slot(9, 10);
      await prisma.$transaction((tx) => bookingRepository.create({ userId, spaceId, startTime, endTime }, tx));

      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).not.toBeNull();
    });

    it("detects a partial overlap", async () => {
      const existing = slot(9, 11);
      await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, ...existing }, tx),
      );

      const requested = slot(10, 12);
      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, requested.startTime, requested.endTime, tx),
      );
      expect(overlap).not.toBeNull();
    });

    it("does not treat back-to-back (touching) slots as overlapping", async () => {
      const existing = slot(9, 10);
      await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, ...existing }, tx),
      );

      const backToBack = slot(10, 11);
      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, backToBack.startTime, backToBack.endTime, tx),
      );
      expect(overlap).toBeNull();
    });

    it("ignores CANCELLED and REJECTED bookings", async () => {
      const { startTime, endTime } = slot(9, 10);
      const cancelled = await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, startTime, endTime }, tx),
      );
      await prisma.booking.update({ where: { id: cancelled.id }, data: { status: "CANCELLED" } });

      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).toBeNull();
    });

    it("considers APPROVED bookings as blocking", async () => {
      const { startTime, endTime } = slot(9, 10);
      const approved = await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, startTime, endTime }, tx),
      );
      await prisma.booking.update({ where: { id: approved.id }, data: { status: "APPROVED" } });

      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).not.toBeNull();
    });

    it("excludes a specific booking id when checking overlap (approval self-exclusion)", async () => {
      const { startTime, endTime } = slot(9, 10);
      const booking = await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, startTime, endTime }, tx),
      );

      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, startTime, endTime, tx, booking.id),
      );
      expect(overlap).toBeNull();
    });

    it("scopes overlap detection to the given space only", async () => {
      const otherSpace = await prisma.space.create({
        data: { name: "booking-repo-test-other-space", type: "DESK", capacity: 1, amenities: [] },
      });
      const { startTime, endTime } = slot(9, 10);
      await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId: otherSpace.id, startTime, endTime }, tx),
      );

      const overlap = await prisma.$transaction((tx) =>
        bookingRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).toBeNull();

      await prisma.booking.deleteMany({ where: { spaceId: otherSpace.id } });
      await prisma.space.delete({ where: { id: otherSpace.id } });
    });
  });

  describe("rejectOverlappingPending", () => {
    it("rejects only overlapping PENDING bookings, excluding the approved one", async () => {
      const approvedSlot = slot(9, 11);
      const approved = await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, ...approvedSlot }, tx),
      );

      const overlappingPending = await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, ...slot(10, 12) }, tx),
      );
      const nonOverlappingPending = await prisma.$transaction((tx) =>
        bookingRepository.create({ userId, spaceId, ...slot(13, 14) }, tx),
      );

      await prisma.$transaction((tx) =>
        bookingRepository.rejectOverlappingPending(
          spaceId,
          approvedSlot.startTime,
          approvedSlot.endTime,
          approved.id,
          tx,
        ),
      );

      const rejected = await prisma.booking.findUnique({ where: { id: overlappingPending.id } });
      const untouched = await prisma.booking.findUnique({ where: { id: nonOverlappingPending.id } });

      expect(rejected?.status).toBe("REJECTED");
      expect(untouched?.status).toBe("PENDING");
    });
  });
});
