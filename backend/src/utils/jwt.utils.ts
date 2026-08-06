import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { JwtPayload } from "../types/jwt.types";

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Refresh tokens are bearer credentials at rest, so the database stores only
 * this one-way hash (not the token itself) -- a database-level read can no
 * longer be replayed as a live session. SHA-256 is used rather than bcrypt
 * because this is an exact-match lookup key, not a slow-verify secret: the
 * token already carries 512 bits of CSPRNG entropy, so there is nothing for
 * a per-hash salt+cost-factor to defend against.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiryDate(): Date {
  const durationMs = parseDurationToMs(env.REFRESH_EXPIRES_IN);
  return new Date(Date.now() + durationMs);
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitMs[unit];
}
