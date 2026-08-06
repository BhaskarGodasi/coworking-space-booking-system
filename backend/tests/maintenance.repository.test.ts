import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { prisma } from "../src/repositories/prisma";
import { maintenanceRepository } from "../src/repositories/maintenance.repository";

describe("maintenanceRepository", () => {
  let spaceId: string;

  beforeAll(async () => {
    const space = await prisma.space.create({
      data: { name: "maintenance-repo-test-space", type: "DESK", capacity: 1, amenities: [] },
    });
    spaceId = space.id;
  });

  afterEach(async () => {
    await prisma.maintenance.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.$disconnect();
  });

  function slot(startHour: number, endHour: number) {
    const day = "2026-09-01";
    return {
      startTime: new Date(`${day}T${String(startHour).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`${day}T${String(endHour).padStart(2, "0")}:00:00.000Z`),
    };
  }

  it("creates a maintenance window", async () => {
    const { startTime, endTime } = slot(9, 10);

    const maintenance = await prisma.$transaction((tx) =>
      maintenanceRepository.create({ spaceId, startTime, endTime, reason: "Deep clean" }, tx),
    );

    expect(maintenance.id).toBeDefined();
    expect(maintenance.reason).toBe("Deep clean");
  });

  it("finds a maintenance window by id", async () => {
    const { startTime, endTime } = slot(9, 10);
    const created = await prisma.$transaction((tx) =>
      maintenanceRepository.create({ spaceId, startTime, endTime, reason: "HVAC service" }, tx),
    );

    const found = await maintenanceRepository.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it("deletes a maintenance window", async () => {
    const { startTime, endTime } = slot(9, 10);
    const created = await prisma.$transaction((tx) =>
      maintenanceRepository.create({ spaceId, startTime, endTime, reason: "Repair" }, tx),
    );

    await maintenanceRepository.delete(created.id);

    const found = await maintenanceRepository.findById(created.id);
    expect(found).toBeNull();
  });

  it("lists maintenance windows filtered by space", async () => {
    const { startTime, endTime } = slot(9, 10);
    await prisma.$transaction((tx) =>
      maintenanceRepository.create({ spaceId, startTime, endTime, reason: "A" }, tx),
    );

    const otherSpace = await prisma.space.create({
      data: { name: "maintenance-repo-test-other-space", type: "DESK", capacity: 1, amenities: [] },
    });
    await prisma.$transaction((tx) =>
      maintenanceRepository.create(
        { spaceId: otherSpace.id, startTime: slot(11, 12).startTime, endTime: slot(11, 12).endTime, reason: "B" },
        tx,
      ),
    );

    const result = await maintenanceRepository.findMany({ spaceId });
    expect(result).toHaveLength(1);
    expect(result[0].spaceId).toBe(spaceId);

    await prisma.maintenance.deleteMany({ where: { spaceId: otherSpace.id } });
    await prisma.space.delete({ where: { id: otherSpace.id } });
  });

  describe("findOverlapping", () => {
    it("returns null when no maintenance window exists", async () => {
      const { startTime, endTime } = slot(9, 10);
      const overlap = await prisma.$transaction((tx) =>
        maintenanceRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).toBeNull();
    });

    it("detects a partial overlap", async () => {
      const existing = slot(9, 11);
      await prisma.$transaction((tx) =>
        maintenanceRepository.create({ spaceId, ...existing, reason: "A" }, tx),
      );

      const requested = slot(10, 12);
      const overlap = await prisma.$transaction((tx) =>
        maintenanceRepository.findOverlapping(spaceId, requested.startTime, requested.endTime, tx),
      );
      expect(overlap).not.toBeNull();
    });

    it("does not treat back-to-back (touching) windows as overlapping", async () => {
      const existing = slot(9, 10);
      await prisma.$transaction((tx) =>
        maintenanceRepository.create({ spaceId, ...existing, reason: "A" }, tx),
      );

      const backToBack = slot(10, 11);
      const overlap = await prisma.$transaction((tx) =>
        maintenanceRepository.findOverlapping(spaceId, backToBack.startTime, backToBack.endTime, tx),
      );
      expect(overlap).toBeNull();
    });

    it("excludes a specific maintenance id when checking overlap", async () => {
      const { startTime, endTime } = slot(9, 10);
      const created = await prisma.$transaction((tx) =>
        maintenanceRepository.create({ spaceId, startTime, endTime, reason: "A" }, tx),
      );

      const overlap = await prisma.$transaction((tx) =>
        maintenanceRepository.findOverlapping(spaceId, startTime, endTime, tx, created.id),
      );
      expect(overlap).toBeNull();
    });

    it("scopes overlap detection to the given space only", async () => {
      const otherSpace = await prisma.space.create({
        data: { name: "maintenance-repo-test-scope-space", type: "DESK", capacity: 1, amenities: [] },
      });
      const { startTime, endTime } = slot(9, 10);
      await prisma.$transaction((tx) =>
        maintenanceRepository.create({ spaceId: otherSpace.id, startTime, endTime, reason: "A" }, tx),
      );

      const overlap = await prisma.$transaction((tx) =>
        maintenanceRepository.findOverlapping(spaceId, startTime, endTime, tx),
      );
      expect(overlap).toBeNull();

      await prisma.maintenance.deleteMany({ where: { spaceId: otherSpace.id } });
      await prisma.space.delete({ where: { id: otherSpace.id } });
    });
  });
});
