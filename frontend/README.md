# Frontend

React + Vite + TypeScript client for the Coworking Space Booking System. See
the root [README](../README.md) and the four frozen architecture documents
for the overall system design; this file covers frontend-specific structure
only.

## Scripts

```bash
npm run dev       # start the Vite dev server
npm run build     # type-check via tsc (through vite build) and produce dist/
npm test          # run the vitest suite
npm run lint      # eslint
```

## Structure

- `src/api/` — one module per backend resource (`auth`, `bookings`, `spaces`,
  `admin`), each wrapping `axios` calls and unwrapping the documented
  `{ success, data }` response envelope.
- `src/api/axios.ts` — the shared `api` (intercepted, attaches the access
  token, retries once through the refresh flow on a 401) and `refreshClient`
  (no interceptors) instances, plus `unwrapData<T>()`, a safe guard against a
  missing/malformed envelope.
- `src/hooks/` — React Query hooks (`useQuery`/`useMutation`) per resource.
- `src/hooks/useSessionRestore.ts` — runs once on app mount to silently
  restore a session from the HttpOnly refresh cookie. Must call
  `refreshClient` directly, never `api` — see the comment in that file for
  why (routing this specific call through `api`'s interceptor would redirect
  every anonymous visitor to `/login` on load).
- `src/components/ErrorBoundary.tsx` — a class component (required by React
  18 for error boundaries) catching render errors anywhere below it in the
  tree. Wraps the whole app in `main.tsx`. Its "back to spaces" action is a
  hard navigation to `/`, not an in-place retry — a caught render error is
  treated as unrecoverable in place.
- `src/pages/NotFoundPage.tsx` — rendered by the catch-all `path="*"` route,
  the last entry in `App.tsx`'s route list.
- `src/store/authStore.ts` — Zustand store for the in-memory session
  (`user`, `accessToken`, `isRestoring`). Deliberately not persisted to
  storage; `useSessionRestore` is what repopulates it after a reload.

## Testing

Tests run under Vitest with `jsdom` (`vitest.config.ts`) and
`@testing-library/react`. Co-locate test files next to the module they cover
(`useSessionRestore.test.ts` next to `useSessionRestore.ts`).
