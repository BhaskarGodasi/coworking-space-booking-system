import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { prisma } from "../src/repositories/prisma";
import { signAccessToken } from "../src/utils/jwt.utils";
import { hashPassword } from "../src/utils/password";

describe("Space endpoints", () => {
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("password123");

    const admin = await prisma.user.create({
      data: {
        email: "space-int-test-admin@example.com",
        passwordHash,
        role: "ADMIN",
        firstName: "Space",
        lastName: "Admin",
      },
    });
    adminToken = signAccessToken({ userId: admin.id, role: admin.role });

    const member = await prisma.user.create({
      data: {
        email: "space-int-test-member@example.com",
        passwordHash,
        role: "MEMBER",
        firstName: "Space",
        lastName: "Member",
      },
    });
    memberToken = signAccessToken({ userId: member.id, role: member.role });
  });

  afterEach(async () => {
    await prisma.space.deleteMany({ where: { name: { contains: "space-int-test" } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: "space-int-test" } } });
    await prisma.$disconnect();
  });

  describe("POST /api/spaces (RBAC)", () => {
    const validBody = {
      name: "space-int-test-rbac",
      type: "DESK",
      capacity: 1,
      amenities: ["wifi"],
    };

    it("rejects an unauthenticated request with 401", async () => {
      const res = await request(app).post("/api/spaces").send(validBody);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects a MEMBER request with 403", async () => {
      const res = await request(app)
        .post("/api/spaces")
        .set("Authorization", `Bearer ${memberToken}`)
        .send(validBody);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows an ADMIN request and returns 201", async () => {
      const res = await request(app)
        .post("/api/spaces")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(validBody.name);
      expect(res.body.data.type).toBe("DESK");
    });

    it("rejects capacity <= 0", async () => {
      const res = await request(app)
        .post("/api/spaces")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validBody, name: "space-int-test-bad-capacity", capacity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects an invalid space type", async () => {
      const res = await request(app)
        .post("/api/spaces")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validBody, name: "space-int-test-bad-type", type: "PENTHOUSE" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("PUT /api/spaces/:id (RBAC)", () => {
    it("rejects a MEMBER request with 403", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-put-rbac", type: "DESK", capacity: 1, amenities: [] },
      });

      const res = await request(app)
        .put(`/api/spaces/${created.id}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ capacity: 2 });

      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request and applies the update", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-put-admin", type: "DESK", capacity: 1, amenities: [] },
      });

      const res = await request(app)
        .put(`/api/spaces/${created.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ capacity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(5);
    });

    it("returns 404 for a non-existent space", async () => {
      const res = await request(app)
        .put("/api/spaces/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ capacity: 5 });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/spaces/:id (RBAC)", () => {
    it("rejects a MEMBER request with 403", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-delete-rbac", type: "DESK", capacity: 1, amenities: [] },
      });

      const res = await request(app)
        .delete(`/api/spaces/${created.id}`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request to soft-delete, hiding it from subsequent GETs", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-delete-admin", type: "DESK", capacity: 1, amenities: [] },
      });

      const deleteRes = await request(app)
        .delete(`/api/spaces/${created.id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);

      const getRes = await request(app).get(`/api/spaces/${created.id}`);
      expect(getRes.status).toBe(404);

      const stillInDb = await prisma.space.findUnique({ where: { id: created.id } });
      expect(stillInDb).not.toBeNull();
      expect(stillInDb?.deletedAt).not.toBeNull();
    });
  });

  describe("GET /api/spaces/deleted (RBAC)", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/spaces/deleted");
      expect(res.status).toBe(401);
    });

    it("rejects a MEMBER request with 403", async () => {
      const res = await request(app)
        .get("/api/spaces/deleted")
        .set("Authorization", `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request and returns only soft-deleted spaces", async () => {
      const active = await prisma.space.create({
        data: { name: "space-int-test-deleted-list-active", type: "DESK", capacity: 1, amenities: [] },
      });
      const deleted = await prisma.space.create({
        data: { name: "space-int-test-deleted-list-deleted", type: "DESK", capacity: 1, amenities: [] },
      });
      await request(app)
        .delete(`/api/spaces/${deleted.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const res = await request(app)
        .get("/api/spaces/deleted")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((s: { id: string }) => s.id);
      expect(ids).toContain(deleted.id);
      expect(ids).not.toContain(active.id);
    });
  });

  describe("PUT /api/spaces/:id/restore (RBAC)", () => {
    it("rejects a MEMBER request with 403", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-restore-rbac", type: "DESK", capacity: 1, amenities: [] },
      });
      await prisma.space.update({ where: { id: created.id }, data: { deletedAt: new Date() } });

      const res = await request(app)
        .put(`/api/spaces/${created.id}/restore`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request to restore a soft-deleted space", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-restore-admin", type: "DESK", capacity: 1, amenities: [] },
      });
      await request(app)
        .delete(`/api/spaces/${created.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const restoreRes = await request(app)
        .put(`/api/spaces/${created.id}/restore`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.deletedAt).toBeNull();

      const getRes = await request(app).get(`/api/spaces/${created.id}`);
      expect(getRes.status).toBe(200);
    });

    it("returns 404 when restoring a space that is not soft-deleted", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-restore-not-deleted", type: "DESK", capacity: 1, amenities: [] },
      });

      const res = await request(app)
        .put(`/api/spaces/${created.id}/restore`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("returns 404 when restoring a non-existent space", async () => {
      const res = await request(app)
        .put("/api/spaces/00000000-0000-0000-0000-000000000000/restore")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/spaces (public listing)", () => {
    it("is accessible without authentication", async () => {
      const res = await request(app).get("/api/spaces");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("paginates using page and limit, with correct meta", async () => {
      for (let i = 0; i < 3; i += 1) {
        await prisma.space.create({
          data: {
            name: `space-int-test-page-${i}`,
            type: "DESK",
            capacity: 1,
            amenities: [],
          },
        });
      }

      const res = await request(app).get(
        "/api/spaces?page=1&limit=2&search=space-int-test-page",
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });

    it("filters by type", async () => {
      await prisma.space.create({
        data: { name: "space-int-test-type-desk", type: "DESK", capacity: 1, amenities: [] },
      });
      await prisma.space.create({
        data: {
          name: "space-int-test-type-room",
          type: "MEETING_ROOM",
          capacity: 8,
          amenities: [],
        },
      });

      const res = await request(app).get(
        "/api/spaces?type=MEETING_ROOM&search=space-int-test-type",
      );

      expect(res.status).toBe(200);
      expect(res.body.data.every((s: { type: string }) => s.type === "MEETING_ROOM")).toBe(true);
    });

    it("searches by name", async () => {
      await prisma.space.create({
        data: {
          name: "space-int-test-unique-search-term",
          type: "DESK",
          capacity: 1,
          amenities: [],
        },
      });

      const res = await request(app).get(
        "/api/spaces?search=space-int-test-unique-search-term",
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("space-int-test-unique-search-term");
    });

    it("rejects an invalid limit with 400", async () => {
      const res = await request(app).get("/api/spaces?limit=0");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("filters by minCapacity", async () => {
      await prisma.space.create({
        data: { name: "space-int-test-cap-small", type: "DESK", capacity: 2, amenities: [] },
      });
      await prisma.space.create({
        data: { name: "space-int-test-cap-large", type: "MEETING_ROOM", capacity: 12, amenities: [] },
      });

      const res = await request(app).get(
        "/api/spaces?search=space-int-test-cap&minCapacity=10",
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("space-int-test-cap-large");
    });

    it("rejects a non-positive minCapacity with 400", async () => {
      const res = await request(app).get("/api/spaces?minCapacity=0");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("filters by date, excluding a space with an overlapping APPROVED booking", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await prisma.user.create({
        data: {
          email: "space-int-test-date-user@example.com",
          passwordHash,
          firstName: "Date",
          lastName: "User",
        },
      });
      const busy = await prisma.space.create({
        data: { name: "space-int-test-date-busy", type: "DESK", capacity: 1, amenities: [] },
      });
      await prisma.space.create({
        data: { name: "space-int-test-date-free", type: "DESK", capacity: 1, amenities: [] },
      });
      await prisma.booking.create({
        data: {
          spaceId: busy.id,
          userId: user.id,
          startTime: new Date("2026-06-01T09:00:00.000Z"),
          endTime: new Date("2026-06-01T10:00:00.000Z"),
          status: "APPROVED",
        },
      });

      const res = await request(app).get(
        "/api/spaces?search=space-int-test-date&date=2026-06-01",
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("space-int-test-date-free");
    });

    it("rejects a malformed date filter with 400", async () => {
      const res = await request(app).get("/api/spaces?date=not-a-date");
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("combines minCapacity and date filters together", async () => {
      const passwordHash = await hashPassword("password123");
      const user = await prisma.user.create({
        data: {
          email: "space-int-test-combined-user@example.com",
          passwordHash,
          firstName: "Combined",
          lastName: "User",
        },
      });
      const busyLarge = await prisma.space.create({
        data: { name: "space-int-test-combined-busy", type: "MEETING_ROOM", capacity: 10, amenities: [] },
      });
      await prisma.space.create({
        data: { name: "space-int-test-combined-free", type: "MEETING_ROOM", capacity: 10, amenities: [] },
      });
      await prisma.space.create({
        data: { name: "space-int-test-combined-small", type: "DESK", capacity: 2, amenities: [] },
      });
      await prisma.booking.create({
        data: {
          spaceId: busyLarge.id,
          userId: user.id,
          startTime: new Date("2026-06-02T09:00:00.000Z"),
          endTime: new Date("2026-06-02T10:00:00.000Z"),
          status: "APPROVED",
        },
      });

      const res = await request(app).get(
        "/api/spaces?search=space-int-test-combined&minCapacity=5&date=2026-06-02",
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("space-int-test-combined-free");
    });
  });

  describe("GET /api/spaces/:id", () => {
    it("returns space details for an existing space", async () => {
      const created = await prisma.space.create({
        data: { name: "space-int-test-details", type: "DESK", capacity: 1, amenities: [] },
      });

      const res = await request(app).get(`/api/spaces/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(created.id);
    });

    it("returns 404 for a non-existent space", async () => {
      const res = await request(app).get("/api/spaces/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/spaces/:id/availability", () => {
    it("returns the documented shape with empty arrays", async () => {
      const created = await prisma.space.create({
        data: {
          name: "space-int-test-availability",
          type: "MEETING_ROOM",
          capacity: 4,
          amenities: [],
        },
      });

      const res = await request(app).get(
        `/api/spaces/${created.id}/availability?date=2026-01-01`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ bookings: [], maintenance: [] });
    });

    it("rejects a malformed date with 400", async () => {
      const created = await prisma.space.create({
        data: {
          name: "space-int-test-bad-date",
          type: "DESK",
          capacity: 1,
          amenities: [],
        },
      });

      const res = await request(app).get(
        `/api/spaces/${created.id}/availability?date=not-a-date`,
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 for a non-existent space", async () => {
      const res = await request(app).get(
        "/api/spaces/00000000-0000-0000-0000-000000000000/availability?date=2026-01-01",
      );
      expect(res.status).toBe(404);
    });
  });
});
