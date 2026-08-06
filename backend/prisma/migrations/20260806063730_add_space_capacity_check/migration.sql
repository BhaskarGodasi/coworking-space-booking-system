-- Enforce capacity > 0 at the database layer as defense in depth,
-- consistent with how Booking.start_time < end_time is documented
-- to be enforced by a CHECK constraint in addition to app-level validation.
ALTER TABLE "Space" ADD CONSTRAINT "Space_capacity_check" CHECK ("capacity" > 0);
