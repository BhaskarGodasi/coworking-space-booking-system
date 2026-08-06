import { prisma } from "../repositories/prisma";
import { maintenanceRepository } from "../repositories/maintenance.repository";
import { bookingRepository } from "../repositories/booking.repository";
import { spaceRepository } from "../repositories/space.repository";
import { ConflictError, NotFoundError } from "../errors/AppError";
import { CreateMaintenanceDTO } from "../dtos/maintenance.dto";

export const maintenanceService = {
  /**
   * Mirrors bookingService.create()'s use of System Architecture v1.1's
   * Concurrency Architecture: the same Space-row lock, acquired via the
   * same primitive, guards maintenance-window creation exactly as it
   * guards booking creation, so the two insert paths fully serialize
   * against each other for a given space. Step 3 (Implementation Design
   * v1.1: "Returns 409 if overlapping with APPROVED/PENDING bookings")
   * checks the Booking table; the Maintenance table is also checked so
   * two overlapping maintenance windows cannot both be created.
   */
  async create(input: CreateMaintenanceDTO) {
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
        throw new ConflictError("Space has an active booking during this time");
      }

      const overlappingMaintenance = await maintenanceRepository.findOverlapping(
        input.spaceId,
        startTime,
        endTime,
        tx,
      );
      if (overlappingMaintenance) {
        throw new ConflictError("Space already has a maintenance window during this time");
      }

      return maintenanceRepository.create(
        { spaceId: input.spaceId, startTime, endTime, reason: input.reason },
        tx,
      );
    });
  },

  async listAll(spaceId?: string) {
    return maintenanceRepository.findMany({ spaceId });
  },

  async remove(maintenanceId: string) {
    const deleted = await maintenanceRepository.deleteIfExists(maintenanceId);
    if (!deleted) {
      throw new NotFoundError("Maintenance window not found");
    }
  },
};
