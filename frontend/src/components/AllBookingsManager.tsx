import { useState } from "react";
import { format } from "date-fns";
import { CalendarX2, Check, CheckCircle2, Clock, X, XCircle } from "lucide-react";
import { useAdminBookings } from "../hooks/useAdminBookings";
import { useApproveBooking } from "../hooks/useApproveBooking";
import { useRejectBooking } from "../hooks/useRejectBooking";
import { useSpaces } from "../hooks/useSpaces";
import { BookingStatus } from "../api/bookings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { ErrorState } from "./common/ErrorState";
import { EmptyState } from "./common/EmptyState";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/toast";

const STATUS_FILTERS: Array<BookingStatus | "all"> = ["all", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function statusLabel(status: BookingStatus | "all") {
  switch (status) {
    case "all": return "All Statuses";
    case "PENDING": return "Pending";
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    case "CANCELLED": return "Cancelled";
    default: return status;
  }
}

function StatusBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case "APPROVED": return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
    case "PENDING": return <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    case "REJECTED": return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
    case "CANCELLED": return <Badge variant="secondary" className="gap-1"><CalendarX2 className="w-3 h-3" /> Cancelled</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function AllBookingsManager() {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

  const bookingsQuery = useAdminBookings(statusFilter === "all" ? undefined : statusFilter);
  const spacesQuery = useSpaces({ page: 1, limit: 100 });
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();
  const { addToast } = useToast();

  const spaceNameById = new Map((spacesQuery.data?.data ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by Status:</span>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        {bookingsQuery.isLoading && (
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {bookingsQuery.isError && (
          <div className="p-8">
            <ErrorState title="Failed to load bookings" message="Could not load bookings. Please try again." onRetry={() => bookingsQuery.refetch()} />
          </div>
        )}

        {!bookingsQuery.isLoading && !bookingsQuery.isError && bookingsQuery.data?.length === 0 && (
          <EmptyState title="No bookings found" description="No bookings match this filter." />
        )}

        {!bookingsQuery.isLoading && bookingsQuery.data && bookingsQuery.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bookingsQuery.data]
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {spaceNameById.get(booking.spaceId) ?? <span className="font-mono text-xs">{booking.spaceId.substring(0,8)}</span>}
                    </TableCell>
                    <TableCell>{format(new Date(booking.startTime), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-8"
                            disabled={approveBooking.isPending || rejectBooking.isPending}
                            onClick={() =>
                              rejectBooking.mutate(booking.id, {
                                onSuccess: () =>
                                  addToast({ title: "Booking rejected", variant: "default" }),
                                onError: () =>
                                  addToast({
                                    title: "Could not reject booking",
                                    description: "Please try again.",
                                    variant: "destructive",
                                  }),
                              })
                            }
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                            disabled={approveBooking.isPending || rejectBooking.isPending}
                            onClick={() =>
                              approveBooking.mutate(booking.id, {
                                onSuccess: () =>
                                  addToast({ title: "Approval successful", variant: "success" }),
                                onError: () =>
                                  addToast({
                                    title: "Could not approve booking",
                                    description: "Please try again.",
                                    variant: "destructive",
                                  }),
                              })
                            }
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default AllBookingsManager;
