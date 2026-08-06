import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { prisma } from "../src/repositories/prisma";
import { signAccessToken } from "../src/utils/jwt.utils";
import { hashPassword } from "../src/utils/password";

describe("Maintenance endpoints", () => {
  let memberToken: string;
  let adminToken: string;
  let spaceId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("password123");

    const member = await prisma.user.create({
      data: {
        email: "maintenance-int-test-member@example.com",
        passwordHash,
        role: "MEMBER",
        firstName: "Maintenance",
        lastName: "Member",
      },
    });
    memberToken = signAccessToken({ userId: member.id, role: member.role });

    const admin = await prisma.user.create({
      data: {
        email: "maintenance-int-test-admin@example.com",
        passwordHash,
        role: "ADMIN",
        firstName: "Maintenance",
        lastName: "Admin",
      },
    });
    adminToken = signAccessToken({ userId: admin.id, role: admin.role });

    const space = await prisma.space.create({
      data: { name: "maintenance-int-test-space", type: "DESK", capacity: 1, amenities: [] },
    });
    spaceId = space.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { spaceId } });
    await prisma.maintenance.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.user.deleteMany({ where: { email: { contains: "maintenance-int-test" } } });
    await prisma.$disconnect();
  });

  function futureIso(daysAhead: number, hour: number) {
    const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  describe("POST /api/maintenance (RBAC)", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const res = await request(app)
        .post("/api/maintenance")
        .send({ spaceId, startTime: futureIso(1, 9), endTime: futureIso(1, 10), reason: "X" });

      expect(res.status).toBe(401);
    });

    it("rejects a MEMBER request with 403", async () => {
      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(1, 9), endTime: futureIso(1, 10), reason: "X" });

      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request and returns 201", async () => {
      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(2, 9), endTime: futureIso(2, 10), reason: "Deep clean" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reason).toBe("Deep clean");
    });

    it("rejects a missing reason with 400", async () => {
      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(3, 9), endTime: futureIso(3, 10) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects endTime <= startTime with 400", async () => {
      const start = futureIso(3, 10);
      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: start, endTime: start, reason: "X" });

      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-existent space", async () => {
      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          spaceId: "00000000-0000-0000-0000-000000000000",
          startTime: futureIso(4, 9),
          endTime: futureIso(4, 10),
          reason: "X",
        });

      expect(res.status).toBe(404);
    });

    it("returns 409 when overlapping an existing maintenance window", async () => {
      const startTime = futureIso(5, 9);
      const endTime = futureIso(5, 10);

      await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime, endTime, reason: "First" });

      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime, endTime, reason: "Second" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("returns 409 when overlapping an existing active booking", async () => {
      const startTime = futureIso(6, 9);
      const endTime = futureIso(6, 10);

      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime, endTime });

      const res = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime, endTime, reason: "Conflicts" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });
  });

  describe("POST /api/bookings vs existing maintenance (reverse direction)", () => {
    it("returns 409 when a booking request overlaps an existing maintenance window", async () => {
      const startTime = futureIso(7, 9);
      const endTime = futureIso(7, 10);

      await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime, endTime, reason: "Scheduled" });

      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime, endTime });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/maintenance (RBAC)", () => {
    it("rejects a MEMBER request with 403", async () => {
      const res = await request(app)
        .get("/api/maintenance")
        .set("Authorization", `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request and supports filtering by spaceId", async () => {
      await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(8, 9), endTime: futureIso(8, 10), reason: "Filtered" });

      const res = await request(app)
        .get(`/api/maintenance?spaceId=${spaceId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((m: { spaceId: string }) => m.spaceId === spaceId)).toBe(true);
    });
  });

  describe("DELETE /api/maintenance/:id (RBAC)", () => {
    it("rejects a MEMBER request with 403", async () => {
      const createRes = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(9, 9), endTime: futureIso(9, 10), reason: "X" });

      const res = await request(app)
        .delete(`/api/maintenance/${createRes.body.data.id}`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request to hard-delete", async () => {
      const createRes = await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(10, 9), endTime: futureIso(10, 10), reason: "X" });

      const deleteRes = await request(app)
        .delete(`/api/maintenance/${createRes.body.data.id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);

      const stillInDb = await prisma.maintenance.findUnique({
        where: { id: createRes.body.data.id },
      });
      expect(stillInDb).toBeNull();
    });

    it("returns 404 for a non-existent maintenance window", async () => {
      const res = await request(app)
        .delete("/api/maintenance/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/spaces/:id/availability now includes real maintenance/booking data", () => {
    it("returns booking and maintenance occupied blocks for the requested date", async () => {
      const date = futureIso(11, 9).slice(0, 10);
      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(11, 9), endTime: futureIso(11, 10) });
      await request(app)
        .post("/api/maintenance")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(11, 14), endTime: futureIso(11, 15), reason: "X" });

      const res = await request(app).get(`/api/spaces/${spaceId}/availability?date=${date}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.maintenance).toHaveLength(1);
    });
  });
});
