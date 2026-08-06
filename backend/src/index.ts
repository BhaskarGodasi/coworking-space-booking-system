import path from "path";
import fs from "fs";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import promBundle from "express-prom-bundle";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { authRouter } from "./routes/auth.routes";
import { spaceRouter } from "./routes/space.routes";
import { bookingRouter } from "./routes/booking.routes";
import { maintenanceRouter } from "./routes/maintenance.routes";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";

export const app = express();

// Render (and any platform load balancer/reverse proxy) terminates TLS and
// forwards plain HTTP to this container, setting X-Forwarded-* headers.
// Without this, req.ip resolves to the proxy's address for every request,
// collapsing all distinct clients into a single bucket for anything keyed
// on it -- most importantly authRateLimiter, whose default keyGenerator is
// req.ip. "1" trusts exactly one hop (Render's own edge).
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(pinoHttp({ logger }));
  app.use(promBundle({ includeMethod: true, includePath: true, metricsPath: "/metrics" }));
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/spaces", spaceRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/maintenance", maintenanceRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found", details: [] },
  });
});

// The Render Docker image bundles the Vite production build into ./public
// (see Dockerfile) so this one process serves both the API and the SPA on
// Render's single assigned port. Local dev (ts-node/nodemon) never builds
// or copies that directory, so these routes are skipped entirely when it's
// absent rather than erroring.
const staticDir = path.join(__dirname, "..", "public");
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use(globalErrorHandler);

if (env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`Backend listening on port ${env.PORT}`);
  });
}
