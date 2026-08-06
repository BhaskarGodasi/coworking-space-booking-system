import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import MaintenanceManager from "../components/MaintenanceManager";

function AdminMaintenancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maintenance Management</h1>
        <p className="text-muted-foreground mt-1">Schedule and manage maintenance windows for spaces.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Schedules</CardTitle>
          <CardDescription>Block off availability for repairs or cleaning.</CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceManager />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminMaintenancePage;
