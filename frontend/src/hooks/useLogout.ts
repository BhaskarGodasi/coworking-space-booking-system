import { useNavigate } from "react-router-dom";
import { logoutRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { useToast } from "../components/ui/toast";

/**
 * Logging out must revoke the session server-side (delete the refresh
 * token row, clear the HttpOnly cookie via POST /auth/logout) before or
 * alongside clearing local state -- clearing only the Zustand store left
 * the refresh cookie live, so a silent session-restore on the next page
 * load would log the "logged out" user back in. Local state is always
 * cleared even if the network call fails (e.g. the user is offline or the
 * access token already expired), since the alternative -- leaving the UI
 * showing a logged-in state after the user asked to log out -- is worse
 * than a refresh token surviving until it naturally expires server-side.
 */
export function useLogout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.logout);
  const { addToast } = useToast();

  return async function logout() {
    try {
      await logoutRequest();
    } catch {
      // Already logged out server-side, network unreachable, or the
      // access token expired -- clearing local state below is still the
      // correct outcome either way.
    } finally {
      clearAuth();
      addToast({ title: "Logged out", variant: "default" });
      navigate("/");
    }
  };
}
