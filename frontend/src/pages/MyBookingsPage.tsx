import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarX2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useOwnBookings } from "../hooks/useOwnBookings";
import { useCancelBooking } from "../hooks/useCancelBooking";
import { Booking } from "../api/bookings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { ErrorState } from "../components/common/ErrorState";
import { EmptyState } from "../components/common/EmptyState";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";

function isCancellable(booking: Booking) {
  const isActiveStatus = booking.status === "PENDING" || booking.status === "APPROVED";
  const isFuture = new Date(booking.startTime).getTime() > Date.now();
  return isActiveStatus && isFuture;
}

function StatusBadge({ status }: { status: Booking["status"] }) {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
    case "PENDING":
      return <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    case "REJECTED":
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary" className="gap-1"><CalendarX2 className="w-3 h-3" /> Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function MyBookingsPage() {
  const { data, isLoading, isError, refetch } = useOwnBookings();
  const cancelBooking = useCancelBooking();
  const { addToast } = useToast();
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  function confirmCancel() {
    if (!cancelTargetId) return;
    cancelBooking.mutate(cancelTargetId, {
      onSuccess: () => {
        addToast({ title: "Booking cancelled", variant: "success" });
        setCancelTargetId(null);
      },
      onError: () => {
        addToast({
          title: "Could not cancel booking",
          description: "Please try again.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage your upcoming and past bookings.</p>
        </div>
        <Button asChild>
          <Link to="/spaces">Book New Space</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Booking History</CardTitle>
          <CardDescription>A list of all your requested space bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {isError && (
            <ErrorState 
              title="Could not load bookings" 
              message="There was an error communicating with the server."
              onRetry={() => refetch()} 
            />
          )}

          {!isLoading && !isError && data && data.length === 0 && (
            <EmptyState 
              title="No bookings found" 
              description="You have no bookings yet. Browse spaces to make your first booking."
              action={<Button asChild variant="outline"><Link to="/spaces">Browse Spaces</Link></Button>}
            />
          )}

          {!isLoading && !isError && data && data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      <Link to={`/spaces/${booking.spaceId}`} className="hover:underline text-primary">
                        Space #{booking.spaceId.substring(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{format(new Date(booking.startTime), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {isCancellable(booking) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={cancelBooking.isPending}
                          onClick={() => setCancelTargetId(booking.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => !open && setCancelTargetId(null)}
        title="Cancel this booking?"
        description="This cannot be undone. You'll need to make a new booking if you change your mind."
        confirmLabel="Cancel Booking"
        cancelLabel="Keep Booking"
        destructive
        isConfirming={cancelBooking.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  );
}

export default MyBookingsPage;
