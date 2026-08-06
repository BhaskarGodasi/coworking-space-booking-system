import { BookingStatus } from "@prisma/client";
import { prisma } from "../repositories/prisma";
import { bookingRepository } from "../repositories/booking.repository";
import { maintenanceRepository } from "../repositories/maintenance.repository";
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
   * 3. Once the lock is held, both the Booking table (PENDING/APPROVED)
   *    and the Maintenance table are queried for any range overlapping
   *    the request, per the documented step 3 ("Query Booking ... and
   *    Maintenance tables for overlapping ranges").
   * 4. If either overlap exists, the transaction throws (Prisma rolls
   *    back automatically) and the caller receives 409 Conflict.
   *    Otherwise the new booking is inserted.
   * 5. The transaction commits, releasing the lock; any request that was
   *    blocked on the same space then acquires it and re-runs step 3
   *    against this booking's (or maintenance window's) now-committed
   *    state.
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

      const overlappingBooking = await bookingRepository.findOverlapping(
        input.spaceId,
        startTime,
        endTime,
        tx,
      );
      if (overlappingBooking) {
        throw new ConflictError("Space is already booked for this time");
      }

      const overlappingMaintenance = await maintenanceRepository.findOverlapping(
        input.spaceId,
        startTime,
        endTime,
        tx,
      );
      if (overlappingMaintenance) {
        throw new ConflictError("Space is unavailable for maintenance during this time");
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

  /**
   * Ownership and future-date checks are pure validation against fields
   * no concurrent request can change (userId, startTime are immutable
   * after creation), so they are safe to check against the initial read.
   * The status transition itself, however, is race-sensitive -- a
   * concurrent approve()/reject() could move the booking out of
   * PENDING/APPROVED between this read and the write below -- so it is
   * expressed as a single atomic conditional UPDATE (transitionStatus)
   * whose WHERE clause re-asserts the expected prior status. If that
   * UPDATE affects zero rows, another request already won the race, and
   * this call must not report success.
   */
  async cancel(bookingId: string, userId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.userId !== userId) {
      throw new ForbiddenError("You can only cancel your own bookings");
    }

    if (booking.startTime.getTime() <= Date.now()) {
      throw new ValidationError("Only future bookings can be cancelled");
    }

    const result = await prisma.$transaction((tx) =>
      bookingRepository.transitionStatus(bookingId, ACTIVE_STATUSES, "CANCELLED", tx),
    );

    if (result.count === 0) {
      throw new ValidationError("Only pending or approved bookings can be cancelled");
    }

    return bookingRepository.findById(bookingId);
  },

  /**
   * Admin Approval flow. Per System Architecture v1.1's Concurrency
   * Architecture, the parent Space row is locked with SELECT ... FOR
   * UPDATE for the duration of the transaction -- the same primitive
   * booking creation uses -- so an approval and a concurrent creation for
   * the same space now serialize against each other rather than each
   * observing a stale, pre-commit view of the other's effect. Within that
   * lock, the target booking is moved to APPROVED via the same atomic
   * conditional UPDATE used by cancel()/reject(), and every other PENDING
   * booking for the space overlapping the approved range is auto-rejected
   * (Implementation Design v1.1: "auto-rejects overlapping PENDING
   * bookings"), all inside the one transaction.
   */
  async approve(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    return prisma.$transaction(async (tx) => {
      await bookingRepository.lockSpaceForUpdate(booking.spaceId, tx);

      const result = await bookingRepository.transitionStatus(bookingId, ["PENDING"], "APPROVED", tx);
      if (result.count === 0) {
        throw new ValidationError("Only pending bookings can be approved");
      }

      await bookingRepository.rejectOverlappingPending(
        booking.spaceId,
        booking.startTime,
        booking.endTime,
        bookingId,
        tx,
      );

      return bookingRepository.findById(bookingId, tx);
    });
  },

  async reject(bookingId: string) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    const result = await prisma.$transaction((tx) =>
      bookingRepository.transitionStatus(bookingId, ["PENDING"], "REJECTED", tx),
    );

    if (result.count === 0) {
      throw new ValidationError("Only pending bookings can be rejected");
    }

    return bookingRepository.findById(bookingId);
  },
};
