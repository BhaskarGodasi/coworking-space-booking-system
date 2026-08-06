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

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

if (env.NODE_ENV !== "test") {
  app.use(pinoHttp({ logger }));
  app.use(promBundle({ includeMethod: true, includePath: true, metricsPath: "/metrics" }));
}

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/spaces", spaceRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/maintenance", maintenanceRouter);

app.use(globalErrorHandler);

if (env.NODE_ENV !== "test") {
  app.listen(env.PORT, () => {
    console.log(`Backend listening on port ${env.PORT}`);
  });
}
