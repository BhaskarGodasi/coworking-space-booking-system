import "./setup";
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { spaceRepository } from "../src/repositories/space.repository";

describe("spaceRepository", () => {
  afterEach(async () => {
    // Spaces first: Booking.userId is onDelete: Restrict, so a fixture user
    // referenced by a booking on one of these spaces can't be deleted until
    // the space (and its cascade-deleted bookings) is gone first.
    await prisma.space.deleteMany({ where: { name: { contains: "space-repo-test" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "space-repo-test" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a space", async () => {
    const space = await spaceRepository.create({
      name: "space-repo-test-create",
      type: "DESK",
      capacity: 1,
      amenities: ["wifi"],
    });

    expect(space.id).toBeDefined();
    expect(space.type).toBe("DESK");
    expect(space.capacity).toBe(1);
    expect(space.deletedAt).toBeNull();
  });

  it("finds a space by id, excluding soft-deleted spaces", async () => {
    const space = await spaceRepository.create({
      name: "space-repo-test-find",
      type: "MEETING_ROOM",
      capacity: 8,
      amenities: [],
    });

    const found = await spaceRepository.findById(space.id);
    expect(found?.id).toBe(space.id);

    await spaceRepository.softDelete(space.id);
    const foundAfterDelete = await spaceRepository.findById(space.id);
    expect(foundAfterDelete).toBeNull();
  });

  it("updates a space", async () => {
    const space = await spaceRepository.create({
      name: "space-repo-test-update",
      type: "DESK",
      capacity: 1,
      amenities: [],
    });

    const updated = await spaceRepository.update(space.id, { capacity: 2 });
    expect(updated.capacity).toBe(2);
  });

  it("soft-deletes a space by setting deletedAt", async () => {
    const space = await spaceRepository.create({
      name: "space-repo-test-delete",
      type: "DESK",
      capacity: 1,
      amenities: [],
    });

    const deleted = await spaceRepository.softDelete(space.id);
    expect(deleted.deletedAt).not.toBeNull();
  });

  describe("restore", () => {
    it("finds a soft-deleted space by id via findDeletedById", async () => {
      const space = await spaceRepository.create({
        name: "space-repo-test-find-deleted",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceRepository.softDelete(space.id);

      const found = await spaceRepository.findDeletedById(space.id);
      expect(found?.id).toBe(space.id);
    });

    it("does not find an active (non-deleted) space via findDeletedById", async () => {
      const space = await spaceRepository.create({
        name: "space-repo-test-find-deleted-active",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });

      const found = await spaceRepository.findDeletedById(space.id);
      expect(found).toBeNull();
    });

    it("restores a soft-deleted space, clearing deletedAt", async () => {
      const space = await spaceRepository.create({
        name: "space-repo-test-restore",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceRepository.softDelete(space.id);

      const restored = await spaceRepository.restore(space.id);
      expect(restored.deletedAt).toBeNull();

      const found = await spaceRepository.findById(space.id);
      expect(found?.id).toBe(space.id);
    });

    it("lists only soft-deleted spaces via listDeleted", async () => {
      const active = await spaceRepository.create({
        name: "space-repo-test-listdeleted-active",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      const deleted = await spaceRepository.create({
        name: "space-repo-test-listdeleted-deleted",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceRepository.softDelete(deleted.id);

      const result = await spaceRepository.listDeleted();
      const ids = result.map((s) => s.id);

      expect(ids).toContain(deleted.id);
      expect(ids).not.toContain(active.id);
    });
  });

  describe("list", () => {
    it("paginates results and reports the correct total", async () => {
      for (let i = 0; i < 3; i += 1) {
        await spaceRepository.create({
          name: `space-repo-test-page-${i}`,
          type: "DESK",
          capacity: 1,
          amenities: [],
        });
      }

      const page1 = await spaceRepository.list({
        page: 1,
        limit: 2,
        search: "space-repo-test-page",
      });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(3);

      const page2 = await spaceRepository.list({
        page: 2,
        limit: 2,
        search: "space-repo-test-page",
      });
      expect(page2.data).toHaveLength(1);

      const page1Ids = page1.data.map((s) => s.id);
      const page2Ids = page2.data.map((s) => s.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });

    it("filters by type", async () => {
      await spaceRepository.create({
        name: "space-repo-test-filter-desk",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceRepository.create({
        name: "space-repo-test-filter-room",
        type: "MEETING_ROOM",
        capacity: 8,
        amenities: [],
      });

      const result = await spaceRepository.list({
        page: 1,
        limit: 10,
        type: "MEETING_ROOM",
        search: "space-repo-test-filter",
      });

      expect(result.data.every((s) => s.type === "MEETING_ROOM")).toBe(true);
      expect(result.data.some((s) => s.name === "space-repo-test-filter-room")).toBe(true);
    });

    it("searches by name, case-insensitively", async () => {
      await spaceRepository.create({
        name: "space-repo-test-Searchable-Name",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });

      const result = await spaceRepository.list({
        page: 1,
        limit: 10,
        search: "searchable-name",
      });

      expect(result.data.some((s) => s.name === "space-repo-test-Searchable-Name")).toBe(true);
    });

    it("excludes soft-deleted spaces from the list", async () => {
      const space = await spaceRepository.create({
        name: "space-repo-test-excluded",
        type: "DESK",
        capacity: 1,
        amenities: [],
      });
      await spaceRepository.softDelete(space.id);

      const result = await spaceRepository.list({
        page: 1,
        limit: 10,
        search: "space-repo-test-excluded",
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by minCapacity, excluding spaces below the threshold", async () => {
      await spaceRepository.create({
        name: "space-repo-test-cap-small",
        type: "DESK",
        capacity: 2,
        amenities: [],
      });
      await spaceRepository.create({
        name: "space-repo-test-cap-large",
        type: "MEETING_ROOM",
        capacity: 10,
        amenities: [],
      });

      const result = await spaceRepository.list({
        page: 1,
        limit: 10,
        search: "space-repo-test-cap",
        minCapacity: 5,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("space-repo-test-cap-large");
    });

    it("rejects nothing but includes exact-match capacity at the threshold", async () => {
      await spaceRepository.create({
        name: "space-repo-test-cap-exact",
        type: "DESK",
        capacity: 4,
        amenities: [],
      });

      const result = await spaceRepository.list({
        page: 1,
        limit: 10,
        search: "space-repo-test-cap-exact",
        minCapacity: 4,
      });

      expect(result.data).toHaveLength(1);
    });

    describe("date-availability filter", () => {
      it("excludes a space with an APPROVED booking overlapping the date", async () => {
        const space = await spaceRepository.create({
          name: "space-repo-test-date-approved",
          type: "DESK",
          capacity: 1,
          amenities: [],
        });
        await prisma.booking.create({
          data: {
            spaceId: space.id,
            userId: (
              await prisma.user.create({
                data: {
                  email: "space-repo-test-date-user@example.com",
                  passwordHash: "x",
                  firstName: "A",
                  lastName: "B",
                },
              })
            ).id,
            startTime: new Date("2026-05-01T09:00:00.000Z"),
            endTime: new Date("2026-05-01T10:00:00.000Z"),
            status: "APPROVED",
          },
        });

        const result = await spaceRepository.list({
          page: 1,
          limit: 10,
          search: "space-repo-test-date-approved",
          date: "2026-05-01",
        });

        expect(result.data).toHaveLength(0);
      });

      it("excludes a space with a PENDING booking overlapping the date", async () => {
        const user = await prisma.user.create({
          data: {
            email: "space-repo-test-date-pending-user@example.com",
            passwordHash: "x",
            firstName: "A",
            lastName: "B",
          },
        });
        const space = await spaceRepository.create({
          name: "space-repo-test-date-pending",
          type: "DESK",
          capacity: 1,
          amenities: [],
        });
        await prisma.booking.create({
          data: {
            spaceId: space.id,
            userId: user.id,
            startTime: new Date("2026-05-02T09:00:00.000Z"),
            endTime: new Date("2026-05-02T10:00:00.000Z"),
            status: "PENDING",
          },
        });

        const result = await spaceRepository.list({
          page: 1,
          limit: 10,
          search: "space-repo-test-date-pending",
          date: "2026-05-02",
        });

        expect(result.data).toHaveLength(0);
      });

      it("does not exclude a space whose booking is CANCELLED or REJECTED on that date", async () => {
        const user = await prisma.user.create({
          data: {
            email: "space-repo-test-date-inactive-user@example.com",
            passwordHash: "x",
            firstName: "A",
            lastName: "B",
          },
        });
        const space = await spaceRepository.create({
          name: "space-repo-test-date-inactive",
          type: "DESK",
          capacity: 1,
          amenities: [],
        });
        await prisma.booking.create({
          data: {
            spaceId: space.id,
            userId: user.id,
            startTime: new Date("2026-05-03T09:00:00.000Z"),
            endTime: new Date("2026-05-03T10:00:00.000Z"),
            status: "CANCELLED",
          },
        });
        await prisma.booking.create({
          data: {
            spaceId: space.id,
            userId: user.id,
            startTime: new Date("2026-05-03T11:00:00.000Z"),
            endTime: new Date("2026-05-03T12:00:00.000Z"),
            status: "REJECTED",
          },
        });

        const result = await spaceRepository.list({
          page: 1,
          limit: 10,
          search: "space-repo-test-date-inactive",
          date: "2026-05-03",
        });

        expect(result.data).toHaveLength(1);
      });

      it("excludes a space with a maintenance window overlapping the date", async () => {
        const space = await spaceRepository.create({
          name: "space-repo-test-date-maintenance",
          type: "DESK",
          capacity: 1,
          amenities: [],
        });
        await prisma.maintenance.create({
          data: {
            spaceId: space.id,
            startTime: new Date("2026-05-04T09:00:00.000Z"),
            endTime: new Date("2026-05-04T10:00:00.000Z"),
            reason: "Cleaning",
          },
        });

        const result = await spaceRepository.list({
          page: 1,
          limit: 10,
          search: "space-repo-test-date-maintenance",
          date: "2026-05-04",
        });

        expect(result.data).toHaveLength(0);
      });

      it("includes a space whose booking does not overlap the requested date", async () => {
        const user = await prisma.user.create({
          data: {
            email: "space-repo-test-date-other-day-user@example.com",
            passwordHash: "x",
            firstName: "A",
            lastName: "B",
          },
        });
        const space = await spaceRepository.create({
          name: "space-repo-test-date-other-day",
          type: "DESK",
          capacity: 1,
          amenities: [],
        });
        await prisma.booking.create({
          data: {
            spaceId: space.id,
            userId: user.id,
            startTime: new Date("2026-05-06T09:00:00.000Z"),
            endTime: new Date("2026-05-06T10:00:00.000Z"),
            status: "APPROVED",
          },
        });

        const result = await spaceRepository.list({
          page: 1,
          limit: 10,
          search: "space-repo-test-date-other-day",
          date: "2026-05-05",
        });

        expect(result.data).toHaveLength(1);
      });

      it("combines capacity and date filters together", async () => {
        const user = await prisma.user.create({
          data: {
            email: "space-repo-test-combined-user@example.com",
            passwordHash: "x",
            firstName: "A",
            lastName: "B",
          },
        });
        const busySmall = await spaceRepository.create({
          name: "space-repo-test-combined-busy-small",
          type: "DESK",
          capacity: 2,
          amenities: [],
        });
        const freeLarge = await spaceRepository.create({
          name: "space-repo-test-combined-free-large",
          type: "MEETING_ROOM",
          capacity: 10,
          amenities: [],
        });
        const busyLarge = await spaceRepository.create({
          name: "space-repo-test-combined-busy-large",
          type: "MEETING_ROOM",
          capacity: 10,
          amenities: [],
        });
        await prisma.booking.create({
          data: {
            spaceId: busyLarge.id,
            userId: user.id,
            startTime: new Date("2026-05-07T09:00:00.000Z"),
            endTime: new Date("2026-05-07T10:00:00.000Z"),
            status: "APPROVED",
          },
        });

        const result = await spaceRepository.list({
          page: 1,
          limit: 10,
          search: "space-repo-test-combined",
          minCapacity: 5,
          date: "2026-05-07",
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe(freeLarge.id);
        expect(busySmall).toBeDefined();
      });
    });
  });
});
