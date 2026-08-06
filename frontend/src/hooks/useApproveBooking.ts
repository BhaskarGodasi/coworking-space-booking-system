import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveBookingRequest } from "../api/admin";

export function useApproveBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveBookingRequest(id),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability", booking.spaceId] });
    },
  });
}
