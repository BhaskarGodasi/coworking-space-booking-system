import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { useAdminBookings } from "../hooks/useAdminBookings";
import { useApproveBooking } from "../hooks/useApproveBooking";
import { useRejectBooking } from "../hooks/useRejectBooking";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";

function ApprovalQueue() {
  const { data, isLoading, isError, refetch } = useAdminBookings("PENDING");
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState 
        title="Failed to load queue" 
        message="Could not load pending bookings. Please try again."
        onRetry={() => refetch()} 
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState 
        title="All caught up" 
        description="There are no pending bookings to review right now."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Space ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium text-xs font-mono">{booking.spaceId}</TableCell>
              <TableCell>{format(new Date(booking.startTime), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                  disabled={approveBooking.isPending || rejectBooking.isPending}
                  onClick={() => rejectBooking.mutate(booking.id)}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={approveBooking.isPending || rejectBooking.isPending}
                  onClick={() => approveBooking.mutate(booking.id)}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ApprovalQueue;
