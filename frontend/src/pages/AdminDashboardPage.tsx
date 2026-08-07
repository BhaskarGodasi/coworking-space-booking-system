import { Building2, CalendarClock, Wrench, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { StatsCard } from "../components/ui/stats-card";
import { Skeleton } from "../components/ui/skeleton";
import ApprovalQueue from "../components/ApprovalQueue";
import { useAuthStore } from "../store/authStore";
import { useSpaces } from "../hooks/useSpaces";
import { useAdminBookings } from "../hooks/useAdminBookings";
import { useMaintenance } from "../hooks/useMaintenance";

function AdminDashboardPage() {
  const { user } = useAuthStore();

  // All figures below come from the same real, already-existing hooks the
  // Spaces/Bookings/Maintenance admin pages use -- no new backend
  // endpoints, just a client-side summary over data already being fetched
  // elsewhere in the app.
  const spacesQuery = useSpaces({ page: 1, limit: 100 });
  const bookingsQuery = useAdminBookings();
  const maintenanceQuery = useMaintenance();

  const statsLoading = spacesQuery.isLoading || bookingsQuery.isLoading || maintenanceQuery.isLoading;

  const totalSpaces = spacesQuery.data?.meta.total ?? 0;
  const pendingCount = bookingsQuery.data?.filter((b) => b.status === "PENDING").length ?? 0;
  const approvedCount = bookingsQuery.data?.filter((b) => b.status === "APPROVED").length ?? 0;
  const now = Date.now();
  const activeMaintenanceCount =
    maintenanceQuery.data?.filter((m) => new Date(m.endTime).getTime() > now).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.firstName}. Here's what's happening today.</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Spaces"
            value={totalSpaces}
            icon={<Building2 className="h-4 w-4" />}
            description="Active workspaces"
          />
          <StatsCard
            title="Pending Bookings"
            value={pendingCount}
            icon={<ClipboardCheck className="h-4 w-4" />}
            description="Awaiting approval"
          />
          <StatsCard
            title="Approved Bookings"
            value={approvedCount}
            icon={<CalendarClock className="h-4 w-4" />}
            description="Confirmed"
          />
          <StatsCard
            title="Active Maintenance"
            value={activeMaintenanceCount}
            icon={<Wrench className="h-4 w-4" />}
            description="Ongoing or upcoming windows"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>Review and manage pending booking requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalQueue />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminDashboardPage;
