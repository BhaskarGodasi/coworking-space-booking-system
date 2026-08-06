import { useState } from "react";
import { useAdminBookings } from "../hooks/useAdminBookings";
import { useApproveBooking } from "../hooks/useApproveBooking";
import { useRejectBooking } from "../hooks/useRejectBooking";
import { useSpaces } from "../hooks/useSpaces";
import { BookingStatus } from "../api/bookings";

const STATUS_FILTERS: Array<BookingStatus | ""> = ["", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function statusLabel(status: BookingStatus | "") {
  switch (status) {
    case "":
      return "All statuses";
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function AllBookingsManager() {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");

  const bookingsQuery = useAdminBookings(statusFilter || undefined);
  const spacesQuery = useSpaces({ page: 1, limit: 100 });
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();

  const spaceNameById = new Map((spacesQuery.data?.data ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <label htmlFor="booking-status-filter">Status</label>
      <select
        id="booking-status-filter"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "")}
      >
        {STATUS_FILTERS.map((status) => (
          <option key={status || "all"} value={status}>
            {statusLabel(status)}
          </option>
        ))}
      </select>

      {bookingsQuery.isLoading && <p role="status">Loading bookings...</p>}

      {bookingsQuery.isError && (
        <div role="alert">
          <p>Could not load bookings. Please try again.</p>
          <button type="button" onClick={() => bookingsQuery.refetch()}>
            Retry
          </button>
        </div>
      )}

      {!bookingsQuery.isLoading && !bookingsQuery.isError && bookingsQuery.data?.length === 0 && (
        <p>No bookings match this filter.</p>
      )}

      {!bookingsQuery.isLoading && bookingsQuery.data && bookingsQuery.data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Space</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...bookingsQuery.data]
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .map((booking) => (
                <tr key={booking.id}>
                  <td>{spaceNameById.get(booking.spaceId) ?? booking.spaceId}</td>
                  <td>{new Date(booking.startTime).toLocaleString()}</td>
                  <td>{new Date(booking.endTime).toLocaleString()}</td>
                  <td>
                    <span data-status={booking.status}>{statusLabel(booking.status)}</span>
                  </td>
                  <td>
                    {booking.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          disabled={approveBooking.isPending || rejectBooking.isPending}
                          onClick={() => approveBooking.mutate(booking.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={approveBooking.isPending || rejectBooking.isPending}
                          onClick={() => rejectBooking.mutate(booking.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AllBookingsManager;
