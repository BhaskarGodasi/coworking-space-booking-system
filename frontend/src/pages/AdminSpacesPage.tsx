import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import SpaceManager from "../components/SpaceManager";

function AdminSpacesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Space Management</h1>
        <p className="text-muted-foreground mt-1">Create, update, and manage coworking spaces.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Spaces</CardTitle>
          <CardDescription>Manage your inventory of desks and meeting rooms.</CardDescription>
        </CardHeader>
        <CardContent>
          <SpaceManager />
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSpacesPage;
