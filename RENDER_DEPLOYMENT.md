# Render Deployment

This app deploys to Render as **one Docker Web Service** (Express serving
both the API and the built React frontend on a single port) plus **one
Render PostgreSQL** instance. `render.yaml` in the repo root codifies the
web service as a Blueprint; it deliberately does not also provision the
database (Render's free tier allows only one free Postgres instance per
account, so the Blueprint assumes you've already created one separately
and will wire its connection string in as a manual env var). The steps
below cover both the Blueprint path and manual dashboard setup.

## Architecture

`backend/Dockerfile` is a three-stage build:

1. `frontend-builder` — runs the Vite production build (`frontend/`).
2. `backend-builder` — compiles the Express/TypeScript API and generates
   the Prisma client (`backend/`).
3. `runner` — the actual deployed image. Installs only production
   dependencies, copies the compiled API (`dist/`), the Prisma schema, and
   the frontend's built static assets (into `./public`). Express serves
   `./public` directly and falls back to `index.html` for any non-`/api`
   route, so the SPA's client-side router (React Router) works correctly
   on a hard refresh of any URL. There is no Nginx in this image — Express
   is the only process, listening on one port, which is what a Render
   Docker Web Service requires.

The app already reads its listen port from `process.env.PORT`
(`backend/src/config/env.ts`), so no code change is needed for Render's
dynamically assigned port — just don't set a `PORT` env var in Render's
dashboard and let Render inject its own.

## Initial deployment

### Option A — Blueprint (`render.yaml`)

1. Create the PostgreSQL instance first (New > PostgreSQL in the Render
   dashboard) if you haven't already, and copy its connection string.
2. Push this repository to a Git provider Render can access.
3. In the Render dashboard: **New > Blueprint**, point it at this repo.
   Render reads `render.yaml` and provisions the `coworking-app` web
   service (the Blueprint has no `databases:` block, so it will not try to
   create a second Postgres instance).
4. Render will prompt for the two variables marked `sync: false` in
   `render.yaml`: **`DATABASE_URL`** and **`CLIENT_URL`**.
   - Set `DATABASE_URL` to the connection string from step 1.
   - `CLIENT_URL` you won't know yet — you won't have the service's public
     URL until after the first deploy, so:
   - Deploy once with a placeholder (e.g. the value doesn't matter for the
     first boot to succeed).
   - Once Render assigns the public URL (`https://coworking-app-xxxx.onrender.com`),
     set `CLIENT_URL` to that exact URL in the service's Environment tab and
     trigger a redeploy (or just a restart — no rebuild needed, it's a
     runtime env var).
5. `JWT_SECRET` and `REFRESH_SECRET` are marked `generateValue: true` —
   Render generates cryptographically random values for these automatically;
   no action needed. Render's managed Postgres connection strings already
   require/support SSL; nothing in this codebase hardcodes an incompatible
   `sslmode`, so the `DATABASE_URL` you pasted in step 4 works as-is.

### Option B — Manual dashboard setup

1. **Create the database first**: New > PostgreSQL. Note the **Internal
   Connection String** it generates (use the internal one if the web
   service will live in the same Render region — it's faster and doesn't
   count against external connection limits).
2. **Create the web service**: New > Web Service > Build and deploy from a
   Git repository > select this repo.
   - **Runtime**: Docker
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Build Context Directory**: `.` (repo root — the Dockerfile
     needs to `COPY` both `frontend/` and `backend/`, so the context can't
     be scoped to just `backend/`)
   - **Health Check Path**: `/health`
3. Set environment variables on the web service (Environment tab):
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = the Postgres instance's connection string from step 1
   - `JWT_SECRET` = a random 32+ character string (Render's "Generate"
     button next to the value field works well)
   - `REFRESH_SECRET` = a different random 32+ character string
   - `JWT_EXPIRES_IN` = `15m` (optional — this is the code's own default)
   - `REFRESH_EXPIRES_IN` = `7d` (optional — same)
   - `CLIENT_URL` = leave unset for the first deploy, then set to the
     service's assigned public URL once known (see Option A, step 3)
   - Do **not** set `PORT` — Render injects this itself.
   - Do **not** set `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` — those
     only configure the self-hosted `db` container in `docker-compose.yml`
     for local development; Render's managed Postgres has its own
     provisioning and only `DATABASE_URL` matters here.
4. Deploy.

## Database migrations

`backend/Dockerfile`'s `CMD` runs `npx prisma migrate deploy` before
starting the server, on every container start (not just the first). This
is safe and idempotent for a **single instance** — `migrate deploy` no-ops
when nothing is pending. It matches this project's `4_Docker_DevOps.md`
spec, which documents this same pre-start-execution pattern.

### Scaling beyond one instance

If this service is ever scaled to more than one Render instance, do **not**
leave migrations in the container's start command as-is: two instances
restarting concurrently (a rolling deploy, a scale-up event) could both run
`migrate deploy` against the same database at the same time. Prisma has
some built-in advisory-locking protection against this, but it isn't a
substitute for decoupling the two operations. Before scaling past one
instance:

1. Move the migration step out of `backend/Dockerfile`'s `CMD` into Render's
   **Pre-Deploy Command** setting (Render dashboard > service > Settings >
   Build & Deploy), set to `npx prisma migrate deploy`. Render runs this
   once per deploy, before any instance starts, not once per instance.
2. Change the Dockerfile's `CMD` to just `node dist/index.js`.

This repository ships with migrations still embedded in `CMD` because the
target deployment here is a single instance; the change above is a
one-line Dockerfile edit plus a dashboard setting if scaling need ever
arises.

## Seeding demo data

`backend/prisma/seed.ts` creates a demo admin, a demo member, 10 sample
spaces, sample bookings, and sample maintenance windows (see the root
`README.md`'s "Demo Data / Seeding" section for exactly what it creates and
its credentials). It's idempotent — safe to run more than once.

Render's **Free** plan has no Shell tab (that requires a paid plan), so
`docker compose exec backend npm run seed` — the command used for local
Docker Compose — has no direct equivalent on Render Free. The seed script
only needs a `DATABASE_URL` to run; it doesn't need to run *inside* the
deployed container. Run it from your own machine against Render's
database instead:

```bash
cd backend
DATABASE_URL="<Render Postgres External Connection String>" npm run seed
```

Use the **External** connection string here (found on the Postgres
instance's Render dashboard page), not the internal one — your machine
isn't on Render's private network. This is the same approach used to
promote a user to admin manually (see `README.md`), just running the seed
script instead of a raw SQL `UPDATE`.

If you're on a paid Render plan with Shell access, running it from the
web service's Shell tab works too:

```bash
npm run seed
```

Either way, run it once after the first successful deploy (and again any
time you want to confirm demo data is intact — it's idempotent, so
re-running is always safe).

## Environment variables reference

| Variable | Required | Source on Render | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | Set manually to `production` | |
| `PORT` | No | Injected by Render | Do not set manually — the app already reads `process.env.PORT` |
| `DATABASE_URL` | Yes | From the Render Postgres instance | Must include the Postgres connection string; SSL is handled by Render's connection string / Prisma's default negotiation, no extra config needed |
| `JWT_SECRET` | Yes | Render "Generate Value" | Must be 32+ characters (enforced by the app's Zod env schema) |
| `REFRESH_SECRET` | Yes | Render "Generate Value" | Must differ from `JWT_SECRET`, 32+ characters |
| `JWT_EXPIRES_IN` | No | Manual, defaults to `15m` | |
| `REFRESH_EXPIRES_IN` | No | Manual, defaults to `7d` | |
| `CLIENT_URL` | Yes | Manual, set to the service's own Render URL | Used only for the `cors()` middleware; same-origin browser traffic through this single service is unaffected either way, but set it correctly for any separate cross-origin client |
| `VITE_API_URL` | No | Not needed | Frontend build-time var; its code default (relative `/api`) is already correct for this same-origin deployment. Only set this (as a Docker build `ARG`, not a runtime env var — Vite bakes it in at build time) if the API is ever split back out to a different origin |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | No (Render) | N/A | Only used by `docker-compose.yml`'s self-hosted `db` service for local development — irrelevant on Render |

## Smoke testing after deploy

Once deployed, verify against the service's public URL:

- `GET /health` → `200 {"status":"ok"}`
- `GET /` → the React app's HTML shell (not a JSON stub)
- `GET /metrics` → Prometheus text output (currently unauthenticated — see
  Known Limitations below)
- Register a new account, log in, refresh the page (confirms session
  restoration works through the refresh cookie), log out
- Create a space (as an admin), create a booking (as a member), approve/
  reject it (as an admin), create a maintenance window that overlaps an
  existing booking and confirm it returns `409`
- Visit a nonexistent path (e.g. `/does-not-exist`) and confirm the SPA's
  client-side 404 page renders (not a raw Express error)
- After running the seed (see "Seeding demo data" above): log in as
  `admin@coworkhub.com` / `Admin@123` and confirm it succeeds with the
  `ADMIN` role, and confirm the 10 demo spaces are visible on the public
  Spaces page without needing to log in first

## Rollback

Render keeps prior successful deploys. If a deploy is bad, use Render's
dashboard **Rollback** action on the service to redeploy the previous
image. Because migrations run as part of container start (see above),
rolling back the *application* does not roll back the *database schema* —
if a bad deploy included a migration, reverting the code alone does not
revert the schema. Schema rollbacks still require the same manual
down-migration process documented in `4_Docker_DevOps.md`'s "Migration
Failure Recovery & Rollback" section.

## Known limitations carried into this deployment

- `/metrics` has no authentication. Low risk for this app's threat model
  (internal booking tool, no sensitive data in request-count metrics), but
  worth restricting (IP allowlist, basic auth, or Render's private
  networking) before treating this as a fully public, unrestricted metrics
  endpoint.
- No graceful shutdown handling (`SIGTERM`/`SIGINT`) exists in
  `backend/src/index.ts`. Render sends `SIGTERM` on redeploys with a grace
  period; the app currently terminates immediately rather than draining
  in-flight requests or closing the Prisma connection cleanly. Low risk for
  a low-traffic single-instance service, but worth hardening later.
- `/health` is a static liveness check — it does not verify database
  connectivity, so a backend with a dead DB connection would still report
  healthy to Render. This matches this project's documented health-check
  contract (`4_Docker_DevOps.md`) but means Render's own restart-on-failure
  safety net won't catch a DB outage.
