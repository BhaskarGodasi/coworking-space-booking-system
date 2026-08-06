import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import ApprovalQueue from "../components/ApprovalQueue";
import { useAuthStore } from "../store/authStore";

function AdminDashboardPage() {
  const { user } = useAuthStore();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.firstName}. Here's what's happening today.</p>
      </div>

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
