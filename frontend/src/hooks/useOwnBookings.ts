import { useQuery } from "@tanstack/react-query";
import { listOwnBookingsRequest } from "../api/bookings";

export function useOwnBookings() {
  return useQuery({
    queryKey: ["bookings", "me"],
    queryFn: listOwnBookingsRequest,
  });
}
