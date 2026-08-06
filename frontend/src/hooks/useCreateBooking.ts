import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBookingRequest, CreateBookingPayload } from "../api/bookings";

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBookingRequest(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability", variables.spaceId] });
    },
  });
}
