import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import AllBookingsManager from "../components/AllBookingsManager";

function AdminBookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bookings Management</h1>
        <p className="text-muted-foreground mt-1">View and manage all system bookings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>Comprehensive list of all past, present, and future bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <AllBookingsManager />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminBookingsPage;
