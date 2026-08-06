# Component Guide

## Component Architecture
Components are organized by feature to ensure scalability and maintainability. Avoid dumping everything into a single `components` folder.

### Directory Structure
```text
frontend/src/
├── components/
│   ├── ui/        # Base generic UI components (Buttons, Inputs, Cards)
│   ├── common/    # Shared components (Navbar, Footer, Error Boundaries)
│   └── layout/    # Layout shells (MainLayout, DashboardLayout)
├── features/
│   ├── auth/      # Login, Register, Password Reset forms
│   ├── spaces/    # Space listing, filtering, detail views
│   ├── bookings/  # Booking modals, lists, management
│   ├── maintenance/# Maintenance forms, calendar views
│   ├── dashboard/ # User/Admin dashboard shells
│   └── admin/     # Admin-specific modules (Approval Queue, etc.)
```

## UI Component Library
We use `shadcn/ui` for our base accessible components. These components wrap Radix UI primitives and are styled with Tailwind CSS.

### Guidelines for Reusable Components
1. **Encapsulation**: Keep styling encapsulated using `clsx` and `tailwind-merge` (via `lib/utils.ts`) so they can accept external `className` overrides securely without style conflicts.
2. **Accessibility**: All interactive elements MUST include focus states (`focus-visible:ring-ring focus-visible:ring-offset-2`), ARIA labels where text is not explicit, and support keyboard navigation (automatically handled by Radix).
3. **Variants**: Use `class-variance-authority` (cva) for components with multiple variants (e.g., Button `default`, `outline`, `ghost`, `destructive`).

## Component State
- **Local State**: Use `useState` for UI-only state (dropdown open, modal open).
- **Server State**: Use TanStack Query (`useQuery`, `useMutation`) for all API data fetching, caching, and invalidation.
- **Global UI State**: Use `zustand` for global client state (e.g., Sidebar collapsed state, currently authenticated user).

## Error and Loading States
Every feature component that fetches data MUST handle:
- **Loading State**: Render a Skeleton loader that matches the dimensions of the final content.
- **Error State**: Render an `ErrorState` component with a retry mechanism.
- **Empty State**: Render an `EmptyState` component with an illustration/icon when a list or query returns no results.
