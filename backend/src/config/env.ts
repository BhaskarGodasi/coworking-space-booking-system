import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  // Refresh tokens are opaque crypto.randomBytes strings hashed with
  // SHA-256 at rest (see jwt.utils.ts), not signed JWTs, so nothing in
  // the codebase actually reads this value today. Kept as a required
  // startup var (not removed) so no existing .env file or deployment
  // config needs to change; reserved for a future JWT-based refresh
  // token design if one is ever adopted.
  REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
