import { spaceRepository } from "../repositories/space.repository";
import { NotFoundError } from "../errors/AppError";
import { CreateSpaceDTO, UpdateSpaceDTO, ListSpacesQueryDTO } from "../dtos/space.dto";

export const spaceService = {
  async list(query: ListSpacesQueryDTO) {
    const { data, total } = await spaceRepository.list({
      page: query.page,
      limit: query.limit,
      type: query.type,
      search: query.search,
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

  async getAvailability(id: string, _date: string) {
    const space = await spaceRepository.findById(id);
    if (!space) {
      throw new NotFoundError("Space not found");
    }

    // Booking and Maintenance windows are introduced in later phases
    // (Roadmap Phase 4/5); until then no occupied blocks exist for any
    // space, so the documented response shape is returned with both arrays
    // genuinely empty rather than stubbed.
    return {
      bookings: [],
      maintenance: [],
    };
  },
};
