import { spaceRepository } from "../repositories/space.repository";
import { prisma } from "../repositories/prisma";
import { NotFoundError } from "../errors/AppError";
import { CreateSpaceDTO, UpdateSpaceDTO, ListSpacesQueryDTO } from "../dtos/space.dto";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatuses";
import { overlapsRange } from "../utils/overlap";

export const spaceService = {
  async list(query: ListSpacesQueryDTO) {
    const { data, total } = await spaceRepository.list({
      page: query.page,
      limit: query.limit,
      type: query.type,
      search: query.search,
      minCapacity: query.minCapacity,
      date: query.date,
    });

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getById(id: string) {
    const space = await spaceRepository.findById(id);
    if (!space) {
      throw new NotFoundError("Space not found");
    }
    return space;
  },

  async create(input: CreateSpaceDTO) {
    return spaceRepository.create({
      name: input.name,
      type: input.type,
      capacity: input.capacity,
      amenities: input.amenities,
    });
  },

  async update(id: string, input: UpdateSpaceDTO) {
    const existing = await spaceRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Space not found");
    }
    return spaceRepository.update(id, input);
  },

  async softDelete(id: string) {
    const existing = await spaceRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Space not found");
    }
    return spaceRepository.softDelete(id);
  },

  /**
   * Implementation Design v1.1's documented availability response shape:
   * { data: { bookings: [{ startTime, endTime }], maintenance: [...] } }.
   * A booking/maintenance window is "on" the requested date if its range
   * overlaps that calendar day in UTC (per System Architecture v1.1's
   * Time Handling Strategy: all timestamps are stored and transmitted in
   * UTC), regardless of which day it starts or ends on.
   */
  async getAvailability(id: string, date: string) {
    const space = await spaceRepository.findById(id);
    if (!space) {
      throw new NotFoundError("Space not found");
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const overlap = overlapsRange(dayStart, dayEnd);

    const [bookings, maintenance] = await Promise.all([
      prisma.booking.findMany({
        where: { spaceId: id, status: { in: ACTIVE_BOOKING_STATUSES }, ...overlap },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.maintenance.findMany({
        where: { spaceId: id, ...overlap },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
      }),
    ]);

    return { bookings, maintenance };
  },

  async listDeleted() {
    return spaceRepository.listDeleted();
  },

  async restore(id: string) {
    const existing = await spaceRepository.findDeletedById(id);
    if (!existing) {
      throw new NotFoundError("Deleted space not found");
    }
    return spaceRepository.restore(id);
  },
};
