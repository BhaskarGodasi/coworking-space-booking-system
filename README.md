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

**Current Phase**: ✅ Phase 1 – Project Foundation

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

## License

MIT
