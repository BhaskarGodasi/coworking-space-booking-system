import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { SpaceTypeValue } from "../constants/spaceTypes";

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
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

function activeSpaceWhere(filter: Pick<ListSpacesFilter, "type" | "search">): Prisma.SpaceWhereInput {
  return {
    deletedAt: null,
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.search ? { name: { contains: filter.search, mode: "insensitive" } } : {}),
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
};
