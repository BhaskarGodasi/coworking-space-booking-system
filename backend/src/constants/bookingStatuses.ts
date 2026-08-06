import { BookingStatus } from "@prisma/client";

/**
 * Bookings in these statuses hold a real claim on a space's time slot and
 * must be considered by overlap/availability checks. CANCELLED and
 * REJECTED bookings are inert and excluded everywhere this is used.
 */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "APPROVED"];
