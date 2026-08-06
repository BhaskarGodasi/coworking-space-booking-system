import "./setup";
import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { requireAuth } from "../src/middlewares/requireAuth";
import { requireRole } from "../src/middlewares/requireRole";
import { signAccessToken } from "../src/utils/jwt.utils";
import { UnauthorizedError, ForbiddenError } from "../src/errors/AppError";
import { ROLES } from "../src/constants/roles";
import { env } from "../src/config/env";

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe("requireAuth", () => {
  it("rejects a request with no Authorization header", () => {
    const req = mockReq();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(req.user).toBeUndefined();
  });

  it("rejects a request with a malformed Authorization header (no Bearer prefix)", () => {
    const req = mockReq({ headers: { authorization: "Token abc123" } });
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("rejects a request with an invalid/tampered token", () => {
    const validToken = signAccessToken({ userId: "user-1", role: ROLES.MEMBER });
    const tampered = validToken.slice(0, -1) + (validToken.endsWith("a") ? "b" : "a");
    const req = mockReq({ headers: { authorization: `Bearer ${tampered}` } });
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("rejects a request with an expired token", () => {
    const expiredToken = jwt.sign({ userId: "user-1", role: ROLES.MEMBER }, env.JWT_SECRET, {
      expiresIn: -10,
    });
    const req = mockReq({ headers: { authorization: `Bearer ${expiredToken}` } });
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("attaches the decoded payload and calls next() for a valid token", () => {
    const token = signAccessToken({ userId: "user-1", role: ROLES.MEMBER });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ userId: "user-1", role: ROLES.MEMBER });
  });
});

describe("requireRole", () => {
  it("rejects when requireAuth has not populated req.user", () => {
    const req = mockReq();
    const next = vi.fn() as unknown as NextFunction;

    requireRole(ROLES.ADMIN)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it("rejects a user whose role is not in the allowed list", () => {
    const req = mockReq({ user: { userId: "user-1", role: ROLES.MEMBER } });
    const next = vi.fn() as unknown as NextFunction;

    requireRole(ROLES.ADMIN)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("calls next() for a user whose role is in the allowed list", () => {
    const req = mockReq({ user: { userId: "user-1", role: ROLES.ADMIN } });
    const next = vi.fn() as unknown as NextFunction;

    requireRole(ROLES.ADMIN)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("allows any of multiple permitted roles", () => {
    const req = mockReq({ user: { userId: "user-1", role: ROLES.MEMBER } });
    const next = vi.fn() as unknown as NextFunction;

    requireRole(ROLES.MEMBER, ROLES.ADMIN)(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
