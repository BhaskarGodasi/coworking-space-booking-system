# System Architecture Document

## Versioning & Revision History
- **Version**: 1.1
- **Revision History**:
  - v1.0: Initial architecture proposal.
  - v1.1: Final authoritative architecture. Added ADRs, unified concurrency strategy, strict RBAC registration rules, and Architecture Freeze Policy.
- **Change Log**: Redesigned concurrency to use pessimistic locking on parent Space rows. Enforced UTC time handling. Hardened registration role assignment.

## Architecture Freeze Policy
**Version 1.1 is the implementation baseline.**
- No architectural changes are allowed during implementation.
- Any architecture change must first update these authoritative documents.
- Claude (the implementing engineer) must **never** redesign the architecture during coding. Follow these specifications exactly.

---

## Architecture Decision Records (ADR)

### ADR-001: PostgreSQL Database
- **Decision**: Use PostgreSQL 15+.
- **Status**: Accepted
- **Why chosen**: Superior handling of complex relational constraints, transactions, and robust data integrity required for a booking system.
- **Alternatives considered**: MongoDB (rejected due to lack of strict ACID transactions across multiple collections natively without complex app logic).
- **Pros**: ACID compliant, strong typing, supports complex indexing.
- **Cons**: Rigid schema requires strict migration management.
- **Future scalability impact**: Excellent vertical scaling. Horizontal read-scaling supported via replicas.

### ADR-002: Prisma ORM
- **Decision**: Use Prisma.
- **Status**: Accepted
- **Why chosen**: Type-safe DB client, auto-generated TypeScript types, and excellent migration CLI.
- **Alternatives considered**: TypeORM, Sequelize.
- **Pros**: Prevents SQL injection natively, high developer productivity.
- **Cons**: Less control over complex raw SQL queries (requires `$queryRaw`).

### ADR-003: Repository Pattern
- **Decision**: Implement a Repository Layer separating Prisma from Services.
- **Status**: Accepted
- **Why chosen**: Decouples business logic from data access, making unit testing easier and allowing future database migrations if necessary.
- **Alternatives considered**: Direct Prisma calls in controllers (Active Record style).
- **Pros**: Clean architecture, testable.
- **Cons**: Slight boilerplate overhead.

### ADR-004: JWT + Refresh Tokens (HttpOnly)
- **Decision**: Short-lived JWTs (15m) in memory, long-lived Refresh Tokens (7d) in HttpOnly cookies.
- **Status**: Accepted
- **Why chosen**: Balances stateless scalability with strict security against XSS (HttpOnly cookie) and CSRF (Bearer token).
- **Alternatives considered**: Session cookies (stateful, harder to scale), LocalStorage JWTs (vulnerable to XSS).

### ADR-005: React + Vite & TanStack Query
- **Decision**: Use React with Vite and TanStack Query for frontend.
- **Status**: Accepted
- **Why chosen**: Industry standard SPA setup. TanStack Query perfectly manages server-state, caching, and loading states.
- **Pros**: Fast HMR, rich ecosystem, optimized caching.

### ADR-006: Booking & Maintenance Availability Strategy
- **Decision**: Atomic Pessimistic Row-Level Locking via parent `Space`.
- **Status**: Accepted
- **Why chosen**: PostgreSQL does not natively support Exclusion Constraints across two different tables (Bookings and Maintenance). To guarantee atomic safety, any insert to `Bookings` or `Maintenance` MUST occur inside a transaction that first locks the parent `Space` row using `SELECT ... FOR UPDATE`.
- **Alternatives considered**: Serialized isolation levels (complex retry logic), Unified table (violates schema requirements).
- **Pros**: 100% immune to race conditions across multiple tables. No deadlocks if locked sequentially.
- **Cons**: Minor performance hit on write throughput for a single space.
- **Future scalability impact**: Highly scalable as contention is isolated to individual spaces.

### ADR-007: Docker & Deployment Strategy
- **Decision**: Containerized multi-stage builds via Docker Compose. Nginx reverse proxy.
- **Status**: Accepted
- **Why chosen**: Guarantees environment parity. Easy vertical scaling on a single VPS or deployment to managed container services (ECS/K8s).

---

## Concurrency Architecture
To ensure atomic protection against double booking and maintenance conflicts, the system uses **Pessimistic Locking**.
1. **Transaction Begins**: `prisma.$transaction`.
2. **Lock Acquisition**: `prisma.$queryRaw('SELECT id FROM "Space" WHERE id = $1 FOR UPDATE', [spaceId])`. This locks the space row. Concurrent requests for this space will block and wait.
3. **Validation Check**: Query `Booking` (status PENDING/APPROVED) and `Maintenance` tables for overlapping ranges with the requested `startTime` and `endTime`.
4. **Action**: If overlap exists, rollback and throw `409 Conflict`. Else, insert new record.
5. **Commit**: Transaction commits, releasing the lock.
This authoritative solution mathematically eliminates race conditions without requiring complex cross-table constraints or serialized retry logic.

---

## Security: Registration Flow
- **Strict Role Enforcement**: The `/api/auth/register` endpoint must **NEVER** accept a `role` field from the client.
- **Validation**: The Request DTO must strictly omit `role`. If sent, the validation layer must strip or reject it.
- **Default Assignment**: The Service layer must hardcode user creation with the `MEMBER` role.
- **Role Elevation**: Only authenticated `ADMIN` users can assign or change roles via a dedicated Admin endpoint.

---

## Time Handling Strategy
- **Storage**: All timestamps (`startTime`, `endTime`, `createdAt`) MUST be stored in the database in **UTC**.
- **API Transport**: All APIs MUST accept and return dates in **ISO-8601 strict format** (e.g., `2026-08-05T10:00:00Z`).
- **Frontend Conversion**: The frontend is strictly responsible for converting UTC timestamps into the user's local timezone for display (using `date-fns` or native `Intl` APIs).
- **DST Handling**: Because storage and transport are purely UTC, Daylight Saving Time shifts are naturally handled by the client's browser locale.
