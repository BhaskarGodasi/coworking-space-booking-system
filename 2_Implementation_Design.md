# Implementation Design Document

## Versioning & Revision History
- **Version**: 1.1
- **Revision History**:
  - v1.0: Initial design.
  - v1.1: Final authoritative implementation design. Added strict coding standards, full API contracts, frontend state management, and unified error handling.

---

## Folder Structure & Responsibilities
```text
/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma   # Single source of truth for DB schema
│   ├── src/
│   │   ├── config/         # Environment variable validation (env.ts)
│   │   ├── constants/      # App constants, enums (roles, statuses)
│   │   ├── controllers/    # Express controllers (extracts req/res)
│   │   ├── dtos/           # Zod schemas (e.g., CreateBookingDTO)
│   │   ├── errors/         # Custom AppError classes
│   │   ├── middlewares/    # Error handler, Auth JWT, RBAC guards
│   │   ├── repositories/   # Prisma abstraction layer
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Core business logic & transactions
│   │   ├── types/          # TS Interfaces
│   │   └── index.ts        # App entry
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance, Interceptors (Refresh Token)
    │   ├── components/     # UI components (Button, Modal, Input)
    │   ├── features/       # Domain modules (spaces, bookings, auth)
    │   ├── hooks/          # TanStack query hooks
    │   ├── layouts/        # AppLayout, AdminLayout
    │   ├── pages/          # Route components
    │   ├── store/          # Zustand store (authStore)
    │   ├── utils/          # Date formatting (date-fns)
    │   └── App.tsx         # React Router config
    └── package.json
```

---

## Coding Standards & Naming Conventions
- **Files/Folders**: `kebab-case` for folders. `camelCase` for utilities. `PascalCase` for React components.
- **DTOs**: `[Action][Entity]DTO` (e.g., `CreateSpaceDTO`).
- **APIs**: RESTful plural nouns (e.g., `/api/spaces`).
- **Database**: `PascalCase` for Models (Prisma default), `camelCase` for fields.
- **Enums**: `UPPER_SNAKE_CASE` (e.g., `MEETING_ROOM`).
- **Services/Repositories**: `[Entity]Service`, `[Entity]Repository`.
- **Hooks**: `use[Action][Entity]` (e.g., `useCreateBooking`).

---

## Project Conventions
- **Identifiers**: UUIDv4 universally.
- **Pagination**: `?page=1&limit=10`. Response: `{ data: [], meta: { total, page, limit } }`.
- **Sorting/Filtering**: `?sortBy=createdAt&order=desc&type=DESK`.
- **Date Format**: ISO-8601 UTC string in JSON.
- **Environment Variables**: Validated strictly at startup via Zod.

---

## Database Schema Design

### Configuration
- **Email**: Case-insensitive. (Prisma: standard String mapped to citext via manual migration if needed, or enforce `.toLowerCase()` at API boundaries).
- **FK Behavior**: `ON DELETE CASCADE` for Bookings and Maintenance when a Space is deleted.
- **Soft Deletes**: `deletedAt DateTime?` for Spaces. Excluded from standard queries.
- **Capacity**: `CHECK (capacity > 0)`.
- **Audit Columns**: `createdAt`, `updatedAt` on all tables.

### Indexes
- **Single**: `User(email)`, `Booking(status)`.
- **Composite**: `Booking(spaceId, startTime, endTime)`, `Maintenance(spaceId, startTime, endTime)`.

---

## Complete API Contracts

### Auth Endpoints
- **`POST /api/auth/register`**
  - **Auth**: Public.
  - **Req DTO**: `{ email, password, firstName, lastName }`. (Role explicitly rejected if provided).
  - **Validation**: Email format, Password strong.
  - **Res DTO**: `{ success: true, data: { user } }`.
  - **Business Rules**: Creates `MEMBER` only. Ensures unique email (case-insensitive).

- **`POST /api/auth/login`**
  - **Auth**: Public.
  - **Req DTO**: `{ email, password }`.
  - **Res DTO**: Access Token (JSON), Refresh Token (HttpOnly Cookie).

- **`POST /api/auth/refresh`** & **`POST /api/auth/logout`**

### Space Endpoints
- **`GET /api/spaces`**
  - **Auth**: Public.
  - **Req Query**: `page, limit, type, search`.
  - **Res DTO**: Paginated list of spaces.
  
- **`GET /api/spaces/:id`**
  - **Auth**: Public.
  - **Res DTO**: Space details.

- **`GET /api/spaces/:id/availability`**
  - **Auth**: Public.
  - **Req Query**: `date` (YYYY-MM-DD).
  - **Res DTO**: `{ data: { bookings: [{ startTime, endTime }], maintenance: [...] } }`.

- **`POST /api/spaces`** & **`PUT /api/spaces/:id`**
  - **Auth**: ADMIN.
  - **Req DTO**: `{ name, type, capacity (must be > 0), amenities }`.

- **`DELETE /api/spaces/:id`**
  - **Auth**: ADMIN.
  - **Business Rule**: Performs Soft Delete (`deletedAt`).

### Booking Endpoints
- **`POST /api/bookings`**
  - **Auth**: MEMBER.
  - **Req DTO**: `{ spaceId, startTime, endTime }`.
  - **Validation**: `startTime` > now, `endTime` > `startTime`.
  - **Res DTO**: `201 Created`, Status: `PENDING`.
  - **Business Rules**: Uses pessimistic locking. Returns 409 if overlap.

- **`GET /api/bookings/me`**
  - **Auth**: MEMBER. Returns user's bookings.

- **`PUT /api/bookings/:id/cancel`**
  - **Auth**: MEMBER.
  - **Business Rule**: Only if `startTime` is in the future and user owns the booking. Status -> `CANCELLED`.

- **`GET /api/bookings`**
  - **Auth**: ADMIN. Query by status.

- **`PUT /api/bookings/:id/approve`**
  - **Auth**: ADMIN.
  - **Business Rule**: Transactionally sets target to `APPROVED`, auto-rejects overlapping `PENDING` bookings.

- **`PUT /api/bookings/:id/reject`**
  - **Auth**: ADMIN. Status -> `REJECTED`.

### Maintenance Endpoints
- **`POST /api/maintenance`**
  - **Auth**: ADMIN.
  - **Req DTO**: `{ spaceId, startTime, endTime, reason }`.
  - **Business Rules**: Pessimistic lock on Space. Returns 409 if overlapping with APPROVED/PENDING bookings.

- **`DELETE /api/maintenance/:id`**
  - **Auth**: ADMIN. Hard deletes the window.

---

## Frontend Architecture

### State & Routing
- **Pages**: Home, Login, Register, SpaceDetails, MemberDashboard, AdminDashboard.
- **Routes**: Wrapped in `<ProtectedRoute>` and `<AdminRoute>`.
- **Query Keys**: `['spaces']`, `['space', id]`, `['bookings', 'me']`, `['availability', spaceId, date]`.
- **Zustand**: `useAuthStore` managing `{ user, isAuthenticated }`.

### UX Behaviors
- **Loading States**: Skeletons for initial loads, disabled button spinners for mutations.
- **Empty States**: Friendly SVG illustrations when no spaces/bookings exist.
- **Retry Behavior**: TanStack Query default (3 retries for GETs). No retries for POST/PUT.
- **Optimistic Updates**: Immediate UI update on Booking Cancel before server confirms, rollback on error.
- **409 Conflict UX**: If user hits "Book" and gets 409, toast displays: "Sorry, this slot was just booked by someone else." The calendar automatically triggers an invalidation to fetch fresh availability.

---

## Standard JSON Error Catalogue
**Format**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [{ "field": "capacity", "message": "Must be greater than 0" }]
  }
}
```
**HTTP Statuses**:
- `400`: Validation, Past Date, Bad Time Range.
- `401`: Missing/Expired JWT.
- `403`: Unauthorized Role, Editing someone else's booking.
- `404`: Space/Booking not found.
- `409`: Concurrency Overlap (Bookings/Maintenance).
- `500`: Unhandled Exception.

---

## RBAC Permission Matrix
| Action | Visitor | Member | Admin |
|--------|---------|--------|-------|
| View Spaces / Availability | ✅ | ✅ | ✅ |
| Login / Register | ✅ | ❌ | ❌ |
| Create Booking | ❌ | ✅ | ✅ |
| View Own Bookings | ❌ | ✅ | ✅ |
| Cancel Own Booking | ❌ | ✅ | ✅ |
| View All Bookings | ❌ | ❌ | ✅ |
| Approve / Reject Bookings | ❌ | ❌ | ✅ |
| Create / Edit / Delete Space| ❌ | ❌ | ✅ |
| Manage Maintenance | ❌ | ❌ | ✅ |

---

## Quality Standards
- **Implementation must strictly adhere to this document.**
- Do NOT invent new endpoints, change DTO shapes, or rename APIs.
- Do NOT modify the database schema without updating this document first.
- Do NOT introduce undocumented third-party libraries.
