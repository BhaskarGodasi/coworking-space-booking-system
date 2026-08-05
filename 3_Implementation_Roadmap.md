# Implementation Roadmap

## Versioning & Revision History
- **Version**: 1.1
- **Revision History**:
  - v1.0: Initial phases.
  - v1.1: Added strict Phase Validation criteria, detailed testing requirements, and comprehensive Quality Gates.

---

## Phase 1: Environment & Foundation

- **Objectives**: Establish Monorepo, Docker configuration, CI/CD linting, and base Express/React skeletons.
- **Deliverables**: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `package.json` files, initial `index.ts` and `main.tsx`.
- **Dependencies**: None.
- **Acceptance Criteria**: Running `docker-compose up` serves React on port 80 and Express returns `{ ok: true }` on port 3000.
- **Testing**: Manual ping of the `/health` endpoint.
- **Completion Checklist**:
  - [ ] Docker files created.
  - [ ] Base server running.
  - [ ] Vite dev server running.
- **Risk Level**: Low.
- **Complexity**: Low.
- **Git Commit Suggestion**: `chore: initialize monorepo and docker infrastructure`
- **Review Checklist**: Ensure multi-stage builds are configured properly.

## Phase 2: Database Modeling & Secure Identity
- **Objectives**: Define Prisma schema, implement strict Users creation, Auth Endpoints, and secure JWT rotation.
- **Deliverables**: `schema.prisma`, `auth.controller.ts`, `auth.service.ts`, `jwt.utils.ts`, frontend `authStore.ts`, Axios interceptors.
- **Dependencies**: Phase 1.
- **Acceptance Criteria**: A user can register (forced to MEMBER role), login, receive a JWT, and auto-refresh using the HttpOnly cookie.
- **Testing**: Unit test token generation. Integration tests for POST `/login` and POST `/refresh`.
- **Completion Checklist**:
  - [ ] Schema migrated.
  - [ ] Role injection prevented.
  - [ ] Refresh token cookie tested.
- **Risk Level**: High (Security core).
- **Complexity**: Medium.
- **Git Commit Suggestion**: `feat: implement secure auth and database schema`
- **Review Checklist**: Verify `role` is stripped from registration DTO. Verify password hashing.

## Phase 3: Space Inventory Management
- **Objectives**: Space CRUD APIs and Public Listing UI.
- **Deliverables**: `space.service.ts`, `space.controller.ts`, `SpaceList.tsx`, `SpaceCard.tsx`, `useSpaces.ts`.
- **Dependencies**: Phase 2.
- **Acceptance Criteria**: Admins can add/edit/soft-delete spaces. Visitors view paginated list with working filters.
- **Testing**: API tests verifying ADMIN role guards on `POST /spaces`.
- **Completion Checklist**:
  - [ ] CRUD endpoints secured.
  - [ ] Soft delete functioning.
  - [ ] UI displays pagination.
- **Risk Level**: Low.
- **Complexity**: Low.
- **Git Commit Suggestion**: `feat: space inventory management and listing UI`
- **Review Checklist**: Verify Capacity > 0 validation.

## Phase 4: Atomic Booking & Maintenance Engine
- **Objectives**: Implement Booking/Maintenance APIs, Pessimistic Locking Concurrency, and Calendar UI.
- **Deliverables**: `booking.service.ts`, `maintenance.service.ts`, `BookingModal.tsx`, `AvailabilityCalendar.tsx`.
- **Dependencies**: Phase 3.
- **Acceptance Criteria**: Creating a booking or maintenance window locks the Space row. Overlaps return 409. UI handles 409 gracefully.
- **Testing**: **CRITICAL**. Write parallel execution test hitting `POST /bookings` simultaneously to guarantee exactly 1 succeeds.
- **Completion Checklist**:
  - [ ] Transactional lock implemented.
  - [ ] Maintenance overlaps blocked.
  - [ ] 409 UI Toast implemented.
- **Risk Level**: Very High.
- **Complexity**: High.
- **Git Commit Suggestion**: `feat: atomic booking engine with pessimistic locking`
- **Review Checklist**: Ensure `SELECT FOR UPDATE` is correctly placed inside the transaction.

## Phase 5: Admin Workflows & Optimistic UI
- **Objectives**: Admin Approval Queue, Auto-rejection logic, Member Dashboard.
- **Deliverables**: `admin.booking.controller.ts`, `AdminDashboard.tsx`, `MemberDashboard.tsx`.
- **Dependencies**: Phase 4.
- **Acceptance Criteria**: Approving a PENDING booking transactionally REJECTS overlapping PENDING bookings. Members can view and cancel own bookings optimistically.
- **Testing**: Integration tests simulating approval conflict resolution.
- **Completion Checklist**:
  - [ ] Approval cascade functioning.
  - [ ] Cancellation UI is optimistic.
- **Risk Level**: Medium.
- **Complexity**: Medium.
- **Git Commit Suggestion**: `feat: admin approval workflows and optimistic dashboards`
- **Review Checklist**: Ensure auto-reject queries target the correct time bounds.

---

## Quality Gate (Required for EVERY Phase)
Implementation cannot proceed to the next phase unless ALL of the following conditions are met:
- [ ] **Build passes**: `npm run build` succeeds for both backend and frontend.
- [ ] **Tests pass**: `npm run test` executes with 100% success rate.
- [ ] **Lint passes**: Zero ESLint or Prettier warnings.
- [ ] **Docker passes**: Containers boot cleanly from a fresh `docker-compose down -v`.
- [ ] **Commit completed**: Code is pushed following the Git Commit Suggestion format.
