import "./setup";
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { spaceService } from "../src/services/space.service";
import { NotFoundError } from "../src/errors/AppError";

describe("spaceService", () => {
  afterEach(async () => {
    await prisma.space.deleteMany({ where: { name: { contains: "space-svc-test" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a space", async () => {
    const space = await spaceService.create({
      name: "space-svc-test-create",
      type: "DESK",
      capacity: 1,
      amenities: [],
    });

    expect(space.name).toBe("space-svc-test-create");
  });

  it("throws NotFoundError when getting a non-existent space", async () => {
    await expect(spaceService.getById("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws NotFoundError when updating a non-existent space", async () => {
    await expect(
      spaceService.update("00000000-0000-0000-0000-000000000000", { capacity: 5 }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when deleting a non-existent space", async () => {
    await expect(
      spaceService.softDelete("00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns a paginated response with correct meta", async () => {
    for (let i = 0; i < 3; i += 1) {
      await spaceService.create({
        name: `space-svc-test-list-${i}`,
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
    }

    const result = await spaceService.list({ page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(2);
    expect(result.meta.total).toBeGreaterThanOrEqual(3);
    expect(result.meta.totalPages).toBe(Math.ceil(result.meta.total / 2));
  });

  it("throws NotFoundError when requesting availability for a non-existent space", async () => {
    await expect(
      spaceService.getAvailability("00000000-0000-0000-0000-000000000000", "2026-01-01"),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns empty bookings and maintenance arrays for availability", async () => {
    const space = await spaceService.create({
      name: "space-svc-test-availability",
      type: "MEETING_ROOM",
      capacity: 4,
      amenities: [],
    });

    const availability = await spaceService.getAvailability(space.id, "2026-01-01");

    expect(availability).toEqual({ bookings: [], maintenance: [] });
  });
});
