import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // The automated test suite drives dozens of legitimate requests against a
  // single long-lived app instance within one process, including dedicated
  // concurrency tests that intentionally fire many simultaneous requests --
  // none of that represents real client traffic, so rate limiting is
  // disabled only under NODE_ENV=test. Development and production are
  // unaffected.
  skip: () => env.NODE_ENV === "test",
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      details: [],
    },
  },
});
