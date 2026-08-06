# Routing Guide

## Application Flow
The application follows a clear separation between public marketing pages and authenticated application features.

### Public Routes
These routes are accessible to all visitors.
- `/` - **Home Page**: Marketing landing page with Hero, Features, Testimonials, and CTAs.
- `/spaces` - **Browse Spaces**: Public listing of available coworking spaces with search and filters.
- `/spaces/:id` - **Space Details**: Public view of a space's details, amenities, and availability calendar. Attempting to book from here redirects to `/login`.

### Authentication Routes
- `/login` - User login page.
- `/register` - User registration page.
*(Both redirect authenticated users to their respective dashboards automatically).*

### Authenticated Routes (Protected)
These routes require a valid JWT session.
- `/dashboard` - **Member Dashboard**: Requires `MEMBER` role. Displays upcoming bookings, history, and profile.
- `/admin` - **Admin Dashboard**: Requires `ADMIN` role. Shell for admin modules.
- `/admin/spaces` - Admin Space Management (CRUD).
- `/admin/bookings` - Admin Bookings Management (All bookings + Approval Queue).
- `/admin/maintenance` - Admin Maintenance Management.

## Navigation Logic
- **Root Redirects**: Authenticated users visiting `/` are automatically redirected:
  - `MEMBER` -> `/dashboard`
  - `ADMIN` -> `/admin`
- **Protected Route Wrapper**: Use a `<ProtectedRoute>` component that checks `authStore`. If unauthenticated, redirect to `/login` with a `returnTo` state.
- **Role Route Wrapper**: Use an `<AdminRoute>` component that checks for the `ADMIN` role. If unauthorized, redirect to `/dashboard` or a 403 page.
