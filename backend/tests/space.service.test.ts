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

  it("forwards minCapacity and date filters from the query to the repository", async () => {
    await spaceService.create({
      name: "space-svc-test-filter-small",
      type: "DESK",
      capacity: 1,
      amenities: [],
    });
    await spaceService.create({
      name: "space-svc-test-filter-large",
      type: "MEETING_ROOM",
      capacity: 12,
      amenities: [],
    });

    const result = await spaceService.list({
      page: 1,
      limit: 10,
      search: "space-svc-test-filter",
      minCapacity: 10,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("space-svc-test-filter-large");
  });

  describe("restore", () => {
    it("throws NotFoundError when restoring a space that isn't soft-deleted", async () => {
      const space = await spaceService.create({
        name: "space-svc-test-restore-active",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });

      await expect(spaceService.restore(space.id)).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when restoring a non-existent space", async () => {
      await expect(
        spaceService.restore("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(NotFoundError);
    });

    it("restores a soft-deleted space so it reappears in getById", async () => {
      const space = await spaceService.create({
        name: "space-svc-test-restore-soft-deleted",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceService.softDelete(space.id);

      await spaceService.restore(space.id);

      const found = await spaceService.getById(space.id);
      expect(found.id).toBe(space.id);
    });

    it("lists only soft-deleted spaces", async () => {
      const active = await spaceService.create({
        name: "space-svc-test-listdeleted-active",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      const deleted = await spaceService.create({
        name: "space-svc-test-listdeleted-deleted",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceService.softDelete(deleted.id);

      const result = await spaceService.listDeleted();
      const ids = result.map((s) => s.id);

      expect(ids).toContain(deleted.id);
      expect(ids).not.toContain(active.id);
    });
  });
});
