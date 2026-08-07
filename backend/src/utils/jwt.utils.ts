import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { JwtPayload } from "../types/jwt.types";

const ACCESS_TOKEN_ALGORITHM = "HS256";

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    algorithm: ACCESS_TOKEN_ALGORITHM,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Without an explicit algorithms allow-list, jwt.verify() accepts a token
 * signed with ANY symmetric algorithm (HS256/HS384/HS512) as long as it
 * was signed with this same secret -- not just the HS256 this app actually
 * issues. That's not itself a forgeable-without-the-secret hole, but
 * pinning the one algorithm this app uses is a no-cost defense-in-depth
 * measure against algorithm-confusion attacks and future library bugs.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ACCESS_TOKEN_ALGORITHM] }) as JwtPayload;
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

export function parseDurationToMs(duration: string): number {
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
