import "./setup";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { prisma } from "../src/repositories/prisma";
import { signAccessToken } from "../src/utils/jwt.utils";
import { hashPassword } from "../src/utils/password";

describe("Booking endpoints", () => {
  let memberToken: string;
  let memberId: string;
  let otherMemberToken: string;
  let adminToken: string;
  let spaceId: string;

  beforeAll(async () => {
    const passwordHash = await hashPassword("password123");

    const member = await prisma.user.create({
      data: {
        email: "booking-int-test-member@example.com",
        passwordHash,
        role: "MEMBER",
        firstName: "Booking",
        lastName: "Member",
      },
    });
    memberId = member.id;
    memberToken = signAccessToken({ userId: member.id, role: member.role });

    const otherMember = await prisma.user.create({
      data: {
        email: "booking-int-test-other@example.com",
        passwordHash,
        role: "MEMBER",
        firstName: "Booking",
        lastName: "Other",
      },
    });
    otherMemberToken = signAccessToken({ userId: otherMember.id, role: otherMember.role });

    const admin = await prisma.user.create({
      data: {
        email: "booking-int-test-admin@example.com",
        passwordHash,
        role: "ADMIN",
        firstName: "Booking",
        lastName: "Admin",
      },
    });
    adminToken = signAccessToken({ userId: admin.id, role: admin.role });

    const space = await prisma.space.create({
      data: { name: "booking-int-test-space", type: "DESK", capacity: 1, amenities: [] },
    });
    spaceId = space.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { spaceId } });
  });

  afterAll(async () => {
    await prisma.space.deleteMany({ where: { id: spaceId } });
    await prisma.user.deleteMany({ where: { email: { contains: "booking-int-test" } } });
    await prisma.$disconnect();
  });

  function futureIso(daysAhead: number, hour: number) {
    const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  describe("POST /api/bookings", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const res = await request(app)
        .post("/api/bookings")
        .send({ spaceId, startTime: futureIso(1, 9), endTime: futureIso(1, 10) });

      expect(res.status).toBe(401);
    });

    it("creates a PENDING booking for a MEMBER with 201", async () => {
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(2, 9), endTime: futureIso(2, 10) });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("PENDING");
    });

    it("rejects a past startTime with 400", async () => {
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: past, endTime: futureIso(3, 10) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects endTime <= startTime with 400", async () => {
      const start = futureIso(3, 10);
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: start, endTime: start });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a date-time with no UTC offset", async () => {
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: "2027-01-01T09:00:00", endTime: "2027-01-01T10:00:00" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for a non-existent space", async () => {
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({
          spaceId: "00000000-0000-0000-0000-000000000000",
          startTime: futureIso(4, 9),
          endTime: futureIso(4, 10),
        });

      expect(res.status).toBe(404);
    });

    it("returns 409 for a conflicting overlapping request", async () => {
      const startTime = futureIso(5, 9);
      const endTime = futureIso(5, 10);

      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime, endTime });

      const conflictRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${otherMemberToken}`)
        .send({ spaceId, startTime, endTime });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe("CONFLICT");
    });

    it("allows an ADMIN to create a booking (RBAC matrix: Create Booking is Member+Admin)", async () => {
      const res = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ spaceId, startTime: futureIso(6, 9), endTime: futureIso(6, 10) });

      expect(res.status).toBe(201);
    });
  });

  describe("GET /api/bookings/me", () => {
    it("rejects an unauthenticated request", async () => {
      const res = await request(app).get("/api/bookings/me");
      expect(res.status).toBe(401);
    });

    it("returns only the caller's own bookings", async () => {
      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(7, 9), endTime: futureIso(7, 10) });
      await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${otherMemberToken}`)
        .send({ spaceId, startTime: futureIso(7, 11), endTime: futureIso(7, 12) });

      const res = await request(app).get("/api/bookings/me").set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe(memberId);
    });
  });

  describe("PUT /api/bookings/:id/cancel", () => {
    it("allows the owner to cancel their own future booking", async () => {
      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(8, 9), endTime: futureIso(8, 10) });

      const res = await request(app)
        .put(`/api/bookings/${createRes.body.data.id}/cancel`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("returns 403 when a different member attempts to cancel", async () => {
      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(9, 9), endTime: futureIso(9, 10) });

      const res = await request(app)
        .put(`/api/bookings/${createRes.body.data.id}/cancel`)
        .set("Authorization", `Bearer ${otherMemberToken}`);

      expect(res.status).toBe(403);
    });

    it("frees the slot for another member once cancelled", async () => {
      const startTime = futureIso(10, 9);
      const endTime = futureIso(10, 10);

      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime, endTime });

      await request(app)
        .put(`/api/bookings/${createRes.body.data.id}/cancel`)
        .set("Authorization", `Bearer ${memberToken}`);

      const secondBookingRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${otherMemberToken}`)
        .send({ spaceId, startTime, endTime });

      expect(secondBookingRes.status).toBe(201);
    });
  });

  describe("GET /api/bookings (admin)", () => {
    it("rejects a MEMBER request with 403", async () => {
      const res = await request(app).get("/api/bookings").set("Authorization", `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it("allows an ADMIN request and supports status filtering", async () => {
      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(11, 9), endTime: futureIso(11, 10) });

      const res = await request(app)
        .get("/api/bookings?status=PENDING")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((b: { id: string }) => b.id === createRes.body.data.id)).toBe(true);
      expect(res.body.data.every((b: { status: string }) => b.status === "PENDING")).toBe(true);
    });

    it("rejects an invalid status filter with 400", async () => {
      const res = await request(app)
        .get("/api/bookings?status=NOT_A_STATUS")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/bookings/:id/approve", () => {
    it("rejects a MEMBER request with 403", async () => {
      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(12, 9), endTime: futureIso(12, 10) });

      const res = await request(app)
        .put(`/api/bookings/${createRes.body.data.id}/approve`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it("approves as ADMIN and auto-rejects an overlapping PENDING booking", async () => {
      const startTime = futureIso(13, 9);
      const endTime = futureIso(13, 11);

      const targetRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime, endTime });

      // A second, different space slot cannot overlap this one at the DB
      // level (each booking's overlap check runs against fresh state), so
      // create the "overlapping pending" row directly to simulate the
      // scenario the acceptance criteria describes: an approval must
      // auto-reject any other PENDING booking for the same space whose
      // range overlaps the just-approved one.
      const overlapping = await prisma.booking.create({
        data: {
          userId: (await prisma.user.findUniqueOrThrow({
            where: { email: "booking-int-test-other@example.com" },
          })).id,
          spaceId,
          startTime: new Date(futureIso(13, 10)),
          endTime: new Date(futureIso(13, 12)),
          status: "PENDING",
        },
      });

      const approveRes = await request(app)
        .put(`/api/bookings/${targetRes.body.data.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe("APPROVED");

      const overlappingAfter = await prisma.booking.findUnique({ where: { id: overlapping.id } });
      expect(overlappingAfter?.status).toBe("REJECTED");
    });
  });

  describe("PUT /api/bookings/:id/reject", () => {
    it("rejects a MEMBER request with 403", async () => {
      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(14, 9), endTime: futureIso(14, 10) });

      const res = await request(app)
        .put(`/api/bookings/${createRes.body.data.id}/reject`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it("rejects as ADMIN", async () => {
      const createRes = await request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ spaceId, startTime: futureIso(15, 9), endTime: futureIso(15, 10) });

      const res = await request(app)
        .put(`/api/bookings/${createRes.body.data.id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
    });
  });

  describe("Concurrency: simultaneous booking requests for the same slot", () => {
    it("allows exactly one of many simultaneous requests to succeed with 201; the rest get 409", async () => {
      const startTime = futureIso(20, 9);
      const endTime = futureIso(20, 10);

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ spaceId, startTime, endTime }),
        ),
      );

      const created = responses.filter((res) => res.status === 201);
      const conflicts = responses.filter((res) => res.status === 409);
      const unexpected = responses.filter((res) => res.status !== 201 && res.status !== 409);

      expect(created).toHaveLength(1);
      expect(conflicts).toHaveLength(responses.length - 1);
      expect(unexpected).toHaveLength(0);

      const bookingCount = await prisma.booking.count({
        where: { spaceId, startTime: new Date(startTime), endTime: new Date(endTime) },
      });
      expect(bookingCount).toBe(1);
    });

    it("allows non-overlapping simultaneous requests for the same space to all succeed", async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          request(app)
            .post("/api/bookings")
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ spaceId, startTime: futureIso(21, 9 + i), endTime: futureIso(21, 10 + i) }),
        ),
      );

      expect(responses.every((res) => res.status === 201)).toBe(true);
    });
  });
});
