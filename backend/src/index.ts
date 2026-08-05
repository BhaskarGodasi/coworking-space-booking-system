import express from "express";
import { env } from "./config/env";

const app = express();

app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(env.PORT, () => {
  console.log(`Backend listening on port ${env.PORT}`);
});
