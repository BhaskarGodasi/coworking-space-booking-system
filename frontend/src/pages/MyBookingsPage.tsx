import { Link } from "react-router-dom";
import { useOwnBookings } from "../hooks/useOwnBookings";
import { useCancelBooking } from "../hooks/useCancelBooking";
import { Booking } from "../api/bookings";

function isCancellable(booking: Booking) {
  const isActiveStatus = booking.status === "PENDING" || booking.status === "APPROVED";
  const isFuture = new Date(booking.startTime).getTime() > Date.now();
  return isActiveStatus && isFuture;
}

function statusLabel(status: Booking["status"]) {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "PENDING":
      return "Pending";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function MyBookingsPage() {
  const { data, isLoading, isError, refetch } = useOwnBookings();
  const cancelBooking = useCancelBooking();

  return (
    <div>
      <Link to="/">Back to spaces</Link>
      <h1>My Bookings</h1>

      {isLoading && <p role="status">Loading your bookings...</p>}

      {isError && (
        <div role="alert">
          <p>Could not load your bookings. Please try again.</p>
          <button type="button" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <p>You have no bookings yet. Browse spaces to make your first booking.</p>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((booking) => (
              <tr key={booking.id}>
                <td>{new Date(booking.startTime).toLocaleString()}</td>
                <td>{new Date(booking.endTime).toLocaleString()}</td>
                <td>
                  <span data-status={booking.status}>{statusLabel(booking.status)}</span>
                </td>
                <td>
                  {isCancellable(booking) && (
                    <button
                      type="button"
                      disabled={cancelBooking.isPending}
                      onClick={() => cancelBooking.mutate(booking.id)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {cancelBooking.isError && (
        <p role="alert">Could not cancel this booking. Please try again.</p>
      )}
    </div>
  );
}

export default MyBookingsPage;
