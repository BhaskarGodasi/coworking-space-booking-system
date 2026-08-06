import { useQuery } from "@tanstack/react-query";
import { listAllBookingsRequest } from "../api/admin";
import { BookingStatus } from "../api/bookings";

export function useAdminBookings(status?: BookingStatus) {
  return useQuery({
    queryKey: ["bookings", "admin", { status }],
    queryFn: () => listAllBookingsRequest(status),
  });
}
