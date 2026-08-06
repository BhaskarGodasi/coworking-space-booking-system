import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rejectBookingRequest } from "../api/admin";

export function useRejectBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rejectBookingRequest(id),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability", booking.spaceId] });
    },
  });
}
