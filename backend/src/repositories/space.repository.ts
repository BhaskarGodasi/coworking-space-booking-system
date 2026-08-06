import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { SpaceTypeValue } from "../constants/spaceTypes";
import { ACTIVE_BOOKING_STATUSES } from "../constants/bookingStatuses";
import { overlapsRange } from "../utils/overlap";

export interface CreateSpaceInput {
  name: string;
  type: SpaceTypeValue;
  capacity: number;
  amenities: string[];
}

export interface UpdateSpaceInput {
  name?: string;
  type?: SpaceTypeValue;
  capacity?: number;
  amenities?: string[];
}

export interface ListSpacesFilter {
  page: number;
  limit: number;
  type?: SpaceTypeValue;
  search?: string;
  minCapacity?: number;
  /** YYYY-MM-DD. When set, spaces with an active booking or a maintenance
   * window overlapping that calendar day are excluded from the results. */
  date?: string;
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Reuses the same overlap predicate as bookingRepository/maintenanceRepository
 * (see ../utils/overlap) rather than re-deriving the interval math, and the
 * same ACTIVE_BOOKING_STATUSES set the booking engine treats as "holds a
 * real claim on the slot" -- CANCELLED/REJECTED bookings never block
 * availability here, matching every other overlap check in the codebase.
 */
function dateOverlapFilter(date: string): Prisma.SpaceWhereInput {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const overlap = overlapsRange(dayStart, dayEnd);

  return {
    bookings: {
      none: { status: { in: ACTIVE_BOOKING_STATUSES }, ...overlap },
    },
    maintenances: {
      none: { ...overlap },
    },
  };
}

function activeSpaceWhere(
  filter: Pick<ListSpacesFilter, "type" | "search" | "minCapacity" | "date">,
): Prisma.SpaceWhereInput {
  return {
    deletedAt: null,
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.search ? { name: { contains: filter.search, mode: "insensitive" } } : {}),
    ...(filter.minCapacity ? { capacity: { gte: filter.minCapacity } } : {}),
    ...(filter.date ? dateOverlapFilter(filter.date) : {}),
  };
}

export const spaceRepository = {
  async list(filter: ListSpacesFilter, client: PrismaClientOrTx = prisma) {
    const where = activeSpaceWhere(filter);

    const [data, total] = await Promise.all([
      client.space.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { createdAt: "desc" },
      }),
      client.space.count({ where }),
    ]);

    return { data, total };
  },

  findById(id: string, client: PrismaClientOrTx = prisma) {
    return client.space.findFirst({ where: { id, deletedAt: null } });
  },

  create(input: CreateSpaceInput, client: PrismaClientOrTx = prisma) {
    return client.space.create({
      data: {
        name: input.name,
        type: input.type,
        capacity: input.capacity,
        amenities: input.amenities,
      },
    });
  },

  update(id: string, input: UpdateSpaceInput, client: PrismaClientOrTx = prisma) {
    return client.space.update({
      where: { id },
      data: input,
    });
  },

  softDelete(id: string, client: PrismaClientOrTx = prisma) {
    return client.space.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  findDeletedById(id: string, client: PrismaClientOrTx = prisma) {
    return client.space.findFirst({ where: { id, deletedAt: { not: null } } });
  },

  restore(id: string, client: PrismaClientOrTx = prisma) {
    return client.space.update({
      where: { id },
      data: { deletedAt: null },
    });
  },

  listDeleted(client: PrismaClientOrTx = prisma) {
    return client.space.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { updatedAt: "desc" },
    });
  },
};
