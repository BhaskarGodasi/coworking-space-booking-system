import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { maintenanceService } from "../src/services/maintenance.service";
import { bookingService } from "../src/services/booking.service";
import { NotFoundError, ConflictError } from "../src/errors/AppError";

describe("maintenanceService", () => {
  let spaceId: string;
  let userId: string;

  beforeAll(async () => {
    const space = await prisma.space.create({
      data: { name: "maintenance-svc-test-space", type: "DESK", capacity: 1, amenities: [] },
    });
    spaceId = space.id;

    const user = await prisma.user.create({
      data: {
        email: "maintenance-svc-test-user@example.com",
        passwordHash: "hashed",
        firstName: "Svc",
        lastName: "Test",
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { spaceId } });
    await prisma.maintenance.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  function futureIso(daysAhead: number, hour: number) {
    const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  it("creates a maintenance window", async () => {
    const maintenance = await maintenanceService.create({
      spaceId,
      startTime: futureIso(1, 9),
      endTime: futureIso(1, 10),
      reason: "Deep clean",
    });

    expect(maintenance.reason).toBe("Deep clean");
  });

  it("throws NotFoundError when the space does not exist", async () => {
    await expect(
      maintenanceService.create({
        spaceId: "00000000-0000-0000-0000-000000000000",
        startTime: futureIso(1, 9),
        endTime: futureIso(1, 10),
        reason: "N/A",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError on a maintenance-vs-maintenance overlap", async () => {
    await maintenanceService.create({
      spaceId,
      startTime: futureIso(2, 9),
      endTime: futureIso(2, 11),
      reason: "First",
    });

    await expect(
      maintenanceService.create({
        spaceId,
        startTime: futureIso(2, 10),
        endTime: futureIso(2, 12),
        reason: "Second",
      }),
    ).rejects.toThrow(ConflictError);
  });

  /**
   * System Architecture v1.1's documented Concurrency Architecture step 3
   * explicitly names both tables: "Query Booking ... and Maintenance
   * tables for overlapping ranges." This test verifies the Maintenance
   * side of that requirement -- a maintenance window cannot be created
   * over an existing active booking.
   */
  it("throws ConflictError when a maintenance window overlaps an active booking", async () => {
    await bookingService.create(userId, {
      spaceId,
      startTime: futureIso(3, 9),
      endTime: futureIso(3, 11),
    });

    await expect(
      maintenanceService.create({
        spaceId,
        startTime: futureIso(3, 10),
        endTime: futureIso(3, 12),
        reason: "Conflicts with booking",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("allows a maintenance window over a CANCELLED booking's original slot", async () => {
    const booking = await bookingService.create(userId, {
      spaceId,
      startTime: futureIso(4, 9),
      endTime: futureIso(4, 10),
    });
    await bookingService.cancel(booking.id, userId);

    const maintenance = await maintenanceService.create({
      spaceId,
      startTime: futureIso(4, 9),
      endTime: futureIso(4, 10),
      reason: "Now free",
    });

    expect(maintenance.id).toBeDefined();
  });

  /**
   * The reverse direction of the same documented requirement: a booking
   * cannot be created over an existing maintenance window.
   */
  it("throws ConflictError when a booking overlaps an existing maintenance window", async () => {
    await maintenanceService.create({
      spaceId,
      startTime: futureIso(5, 9),
      endTime: futureIso(5, 11),
      reason: "Scheduled downtime",
    });

    await expect(
      bookingService.create(userId, {
        spaceId,
        startTime: futureIso(5, 10),
        endTime: futureIso(5, 12),
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("lists maintenance windows, optionally filtered by space", async () => {
    await maintenanceService.create({
      spaceId,
      startTime: futureIso(6, 9),
      endTime: futureIso(6, 10),
      reason: "Listed",
    });

    const result = await maintenanceService.listAll(spaceId);
    expect(result.some((m) => m.reason === "Listed")).toBe(true);
  });

  describe("remove", () => {
    it("hard-deletes a maintenance window", async () => {
      const maintenance = await maintenanceService.create({
        spaceId,
        startTime: futureIso(7, 9),
        endTime: futureIso(7, 10),
        reason: "To be removed",
      });

      await maintenanceService.remove(maintenance.id);

      const found = await prisma.maintenance.findUnique({ where: { id: maintenance.id } });
      expect(found).toBeNull();
    });

    it("throws NotFoundError for a non-existent maintenance window", async () => {
      await expect(
        maintenanceService.remove("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(NotFoundError);
    });

    it("frees the slot for a new booking once removed", async () => {
      const maintenance = await maintenanceService.create({
        spaceId,
        startTime: futureIso(8, 9),
        endTime: futureIso(8, 10),
        reason: "Temporary",
      });

      await maintenanceService.remove(maintenance.id);

      const booking = await bookingService.create(userId, {
        spaceId,
        startTime: futureIso(8, 9),
        endTime: futureIso(8, 10),
      });
      expect(booking.status).toBe("PENDING");
    });
  });
});
