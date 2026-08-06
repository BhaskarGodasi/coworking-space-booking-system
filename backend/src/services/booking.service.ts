import { BookingStatus } from "@prisma/client";
import { prisma } from "../repositories/prisma";
import { bookingRepository } from "../repositories/booking.repository";
import { spaceRepository } from "../repositories/space.repository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/AppError";
import { CreateBookingDTO } from "../dtos/booking.dto";

const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "APPROVED"];

export const bookingService = {
  /**
   * Implements System Architecture v1.1's Concurrency Architecture exactly:
   * 1. prisma.$transaction begins.
   * 2. The parent Space row is locked with SELECT ... FOR UPDATE, so a
   *    concurrent request for the same space blocks here rather than
   *    racing the overlap check below.
   * 3. Once the lock is held, the Booking table is queried for any
   *    PENDING/APPROVED range overlapping the request.
   * 4. If an overlap exists, the transaction throws (Prisma rolls back
   *    automatically) and the caller receives 409 Conflict. Otherwise the
   *    new booking is inserted.
   * 5. The transaction commits, releasing the lock; any request that was
   *    blocked on the same space then acquires it and re-runs step 3
   *    against this booking's now-committed row.
   */
  async create(userId: string, input: CreateBookingDTO) {
    const space = await spaceRepository.findById(input.spaceId);
    if (!space) {
      throw new NotFoundError("Space not found");
    }

    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    return prisma.$transaction(async (tx) => {
      await bookingRepository.lockSpaceForUpdate(input.spaceId, tx);

      const overlapping = await bookingRepository.findOverlapping(
        input.spaceId,
        startTime,
        endTime,
        tx,
      );
      if (overlapping) {
        throw new ConflictError("Space is already booked for this time");
      }

      return bookingRepository.create({ userId, spaceId: input.spaceId, startTime, endTime }, tx);
    });
  },

  async listOwn(userId: string) {
    return bookingRepository.findManyByUser(userId);
  },

  async listAll(status?: BookingStatus) {
    return bookingRepository.findMany({ status });
  },

  async cancel(bookingId: string, userId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.userId !== userId) {
      throw new ForbiddenError("You can only cancel your own bookings");
    }

    if (!ACTIVE_STATUSES.includes(booking.status)) {
      throw new ValidationError("Only pending or approved bookings can be cancelled");
    }

    if (booking.startTime.getTime() <= Date.now()) {
      throw new ValidationError("Only future bookings can be cancelled");
    }

    return bookingRepository.updateStatus(bookingId, "CANCELLED", prisma);
  },

  /**
   * Admin Approval flow: within one transaction, sets the target booking
   * to APPROVED, then auto-rejects every other PENDING booking for the
   * same space overlapping the approved range (Implementation Design v1.1
   * "auto-rejects overlapping PENDING bookings").
   */
  async approve(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new ValidationError("Only pending bookings can be approved");
    }

    return prisma.$transaction(async (tx) => {
      const approved = await bookingRepository.updateStatus(bookingId, "APPROVED", tx);
      await bookingRepository.rejectOverlappingPending(
        booking.spaceId,
        booking.startTime,
        booking.endTime,
        bookingId,
        tx,
      );
      return approved;
    });
  },

  async reject(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.status !== "PENDING") {
      throw new ValidationError("Only pending bookings can be rejected");
    }

    return bookingRepository.updateStatus(bookingId, "REJECTED", prisma);
  },
};
