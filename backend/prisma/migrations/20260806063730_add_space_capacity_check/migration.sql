-- Enforce capacity > 0 at the database layer as defense in depth.
-- Booking.start_time < end_time is validated at the application layer
-- only (see bookingService); no equivalent CHECK constraint exists for it.
ALTER TABLE "Space" ADD CONSTRAINT "Space_capacity_check" CHECK ("capacity" > 0);
