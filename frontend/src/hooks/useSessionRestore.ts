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
 */
export function useSessionRestore() {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRestoring = useAuthStore((state) => state.setRestoring);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const { data } = await refreshClient.post("/auth/refresh");
        const { accessToken } = unwrapData<{ accessToken: string }>(data);
        const decoded = decodeAccessToken(accessToken);

        if (cancelled) return;

        if (decoded) {
          login({ id: decoded.userId, role: decoded.role }, accessToken);
        } else {
          setAccessToken(accessToken);
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
