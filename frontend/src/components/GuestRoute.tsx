import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * The inverse of ProtectedRoute: keeps an already-authenticated user off
 * visitor-only pages (login/register) by sending them to the dashboard
 * their role actually uses, instead of showing the auth forms again.
 */
function GuestRoute({ children }: GuestRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isRestoring = useAuthStore((state) => state.isRestoring);

  if (isRestoring) {
    return <p role="status">Loading...</p>;
  }

  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

export default GuestRoute;
