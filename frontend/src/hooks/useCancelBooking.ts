import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Booking, cancelBookingRequest } from "../api/bookings";

const OWN_BOOKINGS_KEY = ["bookings", "me"];

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelBookingRequest(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: OWN_BOOKINGS_KEY });

      const previousBookings = queryClient.getQueryData<Booking[]>(OWN_BOOKINGS_KEY);

      if (previousBookings) {
        queryClient.setQueryData<Booking[]>(
          OWN_BOOKINGS_KEY,
          previousBookings.map((booking) =>
            booking.id === id ? { ...booking, status: "CANCELLED" } : booking,
          ),
        );
      }

      return { previousBookings };
    },
    onError: (_error, _id, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(OWN_BOOKINGS_KEY, context.previousBookings);
      }
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability", booking.spaceId] });
    },
  });
}
