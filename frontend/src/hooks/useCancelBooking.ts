import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelBookingRequest } from "../api/bookings";

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelBookingRequest(id),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability", booking.spaceId] });
    },
  });
}
