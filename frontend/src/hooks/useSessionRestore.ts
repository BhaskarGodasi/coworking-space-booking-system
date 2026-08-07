import { useEffect } from "react";
import { refreshClient, unwrapData } from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { decodeAccessToken } from "../utils/jwt";

/**
 * On first app load, the in-memory auth store is always empty (Zustand
 * here has no persistence -- see the store's own comment), even if the
 * browser is still holding a valid HttpOnly refresh cookie from an
 * earlier session. Without this, every page reload looks identical to a
 * fresh logout. This attempts one silent POST /api/auth/refresh using
 * that cookie; a 401 (no cookie, or an expired/already-rotated one)
 * simply leaves the user logged out, which is the correct fallback.
 *
 * This MUST use `refreshClient`, not `api`. `api` carries the response
 * interceptor that redirects to /login on any refresh failure -- correct
 * for a 401 raised by an authenticated call on a protected route, but
 * wrong here: this call fires unconditionally on every page load,
 * including public ones (Visitor-accessible routes), so routing it
 * through that interceptor would force every anonymous visitor to
 * /login. `refreshClient` has no interceptors, so a failed restore just
 * falls through to this function's own catch and leaves the visitor
 * exactly where they were.
 *
 * Refresh tokens are single-use (see backend/src/services/auth.service.ts):
 * if two tabs sharing the same browser cookie jar both reload around the
 * same moment, both fire this same POST /auth/refresh with the identical
 * current cookie, and exactly one gets the rotated successor -- the other
 * gets a 401 even though the user's session is perfectly alive, because it
 * lost a race against its own other tab, not because the session expired.
 * Without coordination that tab settles into a false "logged out" state
 * with no automatic recovery (confirmed via live multi-tab testing).
 *
 * The Web Locks API serializes this critical section across every tab/frame
 * sharing this origin: only one at a time is inside the lock callback, so a
 * second tab's call simply waits instead of firing a competing request with
 * a cookie value that's about to be invalidated out from under it. By the
 * time it acquires the lock, the browser has already applied the first
 * tab's Set-Cookie, so its own attempt reads that fresh, still-valid token
 * instead of replaying the one that just lost. Falls back to running
 * unlocked when navigator.locks isn't available (older browsers) --
 * unsynchronized is exactly today's pre-fix behavior, not a new failure
 * mode.
 */
export function useSessionRestore() {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRestoring = useAuthStore((state) => state.setRestoring);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    let cancelled = false;

    async function attemptRefresh() {
      const { data } = await refreshClient.post("/auth/refresh");
      const { accessToken } = unwrapData<{ accessToken: string }>(data);
      const decoded = decodeAccessToken(accessToken);

      if (cancelled) return;

      if (decoded) {
        login({ id: decoded.userId, role: decoded.role }, accessToken);
      } else {
        setAccessToken(accessToken);
      }
    }

    async function restore() {
      try {
        if (typeof navigator !== "undefined" && navigator.locks) {
          await navigator.locks.request("auth-refresh", attemptRefresh);
        } else {
          await attemptRefresh();
        }
      } catch {
        // No valid refresh cookie -- the user is simply not logged in.
      } finally {
        if (!cancelled) {
          setRestoring(false);
        }
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
