import "./setup";
import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { prisma } from "../src/repositories/prisma";

describe("Auth endpoints", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: "auth-int-test" } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("creates a new user and never accepts a client-supplied role", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "auth-int-test-register@example.com",
          password: "password123",
          firstName: "Jane",
          lastName: "Doe",
          role: "ADMIN",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("registers a member with a valid payload", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "auth-int-test-valid@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("MEMBER");
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it("rejects a duplicate email with 409", async () => {
      const payload = {
        email: "auth-int-test-dup@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
      };

      await request(app).post("/api/auth/register").send(payload);
      const res = await request(app).post("/api/auth/register").send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("rejects a malformed payload with 400", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "not-an-email",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("resolves concurrent registrations for the same email to exactly one 201 and the rest 409, with no 500s", async () => {
      const payload = {
        email: "auth-int-test-concurrent-register@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
      };

      const responses = await Promise.all(
        Array.from({ length: 8 }, () => request(app).post("/api/auth/register").send(payload)),
      );

      const created = responses.filter((res) => res.status === 201);
      const conflicts = responses.filter((res) => res.status === 409);
      const unexpected = responses.filter((res) => res.status !== 201 && res.status !== 409);

      expect(created).toHaveLength(1);
      expect(conflicts).toHaveLength(responses.length - 1);
      expect(unexpected).toHaveLength(0);
      conflicts.forEach((res) => {
        expect(res.body.error.code).toBe("CONFLICT");
      });

      const userCount = await prisma.user.count({ where: { email: payload.email } });
      expect(userCount).toBe(1);
    });
  });

  describe("POST /api/auth/login", () => {
    async function registerUser(email: string) {
      await request(app).post("/api/auth/register").send({
        email,
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
      });
    }

    it("logs in with valid credentials and sets an HttpOnly refresh cookie", async () => {
      const email = "auth-int-test-login@example.com";
      await registerUser(email);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(email);

      const setCookieHeader = res.headers["set-cookie"];
      expect(setCookieHeader).toBeDefined();
      const cookieString = Array.isArray(setCookieHeader)
        ? setCookieHeader.join(";")
        : setCookieHeader;
      expect(cookieString).toContain("refreshToken=");
      expect(cookieString.toLowerCase()).toContain("httponly");
    });

    it("rejects an incorrect password with 401", async () => {
      const email = "auth-int-test-badpw@example.com";
      await registerUser(email);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong-password" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects a non-existent email with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "auth-int-test-nobody@example.com", password: "password123" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    async function registerAndLogin(email: string) {
      await request(app).post("/api/auth/register").send({
        email,
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "password123" });

      const cookie = loginRes.headers["set-cookie"];
      return Array.isArray(cookie) ? cookie : [cookie];
    }

    it("issues a new access token given a valid refresh cookie", async () => {
      const cookies = await registerAndLogin("auth-int-test-refresh@example.com");

      const res = await request(app).post("/api/auth/refresh").set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it("rotates the refresh token so the old one can no longer be used", async () => {
      const cookies = await registerAndLogin("auth-int-test-rotate@example.com");

      const firstRefresh = await request(app).post("/api/auth/refresh").set("Cookie", cookies);
      expect(firstRefresh.status).toBe(200);

      // Re-using the original (now-rotated) refresh cookie must fail.
      const secondAttempt = await request(app).post("/api/auth/refresh").set("Cookie", cookies);

      expect(secondAttempt.status).toBe(401);
    });

    it("under concurrent refresh requests with the same cookie, exactly one succeeds", async () => {
      const cookies = await registerAndLogin("auth-int-test-refresh-concurrent@example.com");

      const responses = await Promise.all(
        Array.from({ length: 8 }, () =>
          request(app).post("/api/auth/refresh").set("Cookie", cookies),
        ),
      );

      const succeeded = responses.filter((res) => res.status === 200);
      const rejected = responses.filter((res) => res.status === 401);
      const unexpected = responses.filter((res) => res.status !== 200 && res.status !== 401);

      expect(succeeded).toHaveLength(1);
      expect(rejected).toHaveLength(responses.length - 1);
      expect(unexpected).toHaveLength(0);

      // The one successful rotation must itself still work as a fresh, valid token.
      const newCookie = succeeded[0].headers["set-cookie"];
      const newCookieArray = Array.isArray(newCookie) ? newCookie : [newCookie];
      const followUp = await request(app).post("/api/auth/refresh").set("Cookie", newCookieArray);
      expect(followUp.status).toBe(200);
    });

    it("rejects a request with no refresh cookie", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears the refresh cookie and invalidates the stored token", async () => {
      const email = "auth-int-test-logout@example.com";
      await request(app).post("/api/auth/register").send({
        email,
        password: "password123",
        firstName: "Jane",
        lastName: "Doe",
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "password123" });

      const cookies = loginRes.headers["set-cookie"];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

      const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookieArray);
      expect(logoutRes.status).toBe(200);

      const refreshAfterLogout = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookieArray);
      expect(refreshAfterLogout.status).toBe(401);
    });
  });
});
