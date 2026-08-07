# Coworking Space Booking System

## Overview

Coworking space booking platform built with:

- React
- Vite
- Node.js
- Express
- PostgreSQL
- Prisma
- Docker

## Project Status

**Architecture Baseline**: v1.1

**Current Phase**: ✅ Phase 5 – Admin Workflows & Optimistic UI (all roadmap phases complete; production-readiness hardening applied)

## Documentation

- [System Architecture](1_System_Architecture.md)
- [Implementation Design](2_Implementation_Design.md)
- [Implementation Roadmap](3_Implementation_Roadmap.md)
- [Docker & DevOps](4_Docker_DevOps.md)

## Tech Stack

**Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
**Frontend**: React, Vite
**Auth**: JWT (access + refresh token rotation)
**Infrastructure**: Docker, Docker Compose, Nginx

## Getting Started

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend: [http://localhost](http://localhost)
- Backend: [http://localhost:3000](http://localhost:3000)
- Backend health check: [http://localhost:3000/health](http://localhost:3000/health)

To stop the stack without deleting the database volume:

```bash
docker compose down
```

Only use `docker compose down -v` when you intentionally want to wipe the PostgreSQL data volume.

## Demo Data / Seeding

Populate the database with a demo admin, a demo member, 10 sample spaces, a
mix of sample bookings, and sample maintenance windows:

```bash
cd backend
npm run seed
```

Or, if you're running the stack via Docker Compose:

```bash
docker compose exec backend npm run seed
```

**Demo accounts created:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@coworkhub.com` | `Admin@123` |
| Member | `member@coworkhub.com` | `Member@123` |

**Also created:**
- 10 spaces (a mix of Desks and Meeting Rooms, varying capacities and amenities)
- 6 sample bookings (2 approved, 2 pending, 1 cancelled, 1 rejected)
- 3 sample maintenance windows

The seed is **idempotent** — every seeded row has a fixed id, and the script
upserts on that id, so running `npm run seed` any number of times converges
to the same data instead of creating duplicates. It's safe to re-run after
pulling new code or resetting between demos.

The seed script only creates its own fixed demo rows; it never modifies or
deletes any other data already in the database.

## License

MIT
