-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Space_deletedAt_type_idx" ON "Space"("deletedAt", "type");
