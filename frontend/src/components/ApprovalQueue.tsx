import { useAdminBookings } from "../hooks/useAdminBookings";
import { useApproveBooking } from "../hooks/useApproveBooking";
import { useRejectBooking } from "../hooks/useRejectBooking";

function ApprovalQueue() {
  const { data, isLoading, isError, refetch } = useAdminBookings("PENDING");
  const approveBooking = useApproveBooking();
  const rejectBooking = useRejectBooking();

  if (isLoading) {
    return <p role="status">Loading pending bookings...</p>;
  }

  if (isError) {
    return (
      <div role="alert">
        <p>Could not load pending bookings. Please try again.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p>No pending bookings to review.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Space</th>
          <th>Start</th>
          <th>End</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((booking) => (
          <tr key={booking.id}>
            <td>{booking.spaceId}</td>
            <td>{new Date(booking.startTime).toLocaleString()}</td>
            <td>{new Date(booking.endTime).toLocaleString()}</td>
            <td>
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ApprovalQueue;
