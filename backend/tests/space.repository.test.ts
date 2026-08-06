import "./setup";
import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { spaceRepository } from "../src/repositories/space.repository";

describe("spaceRepository", () => {
  afterEach(async () => {
    await prisma.space.deleteMany({ where: { name: { contains: "space-repo-test" } } });
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
  });
});
