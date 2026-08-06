import { z } from "zod";
import { SPACE_TYPES } from "../constants/spaceTypes";

const spaceTypeEnum = z.enum(SPACE_TYPES);

export const CreateSpaceDTO = z
  .object({
    name: z.string().min(1),
    type: spaceTypeEnum,
    capacity: z.number().int().positive(),
    amenities: z.array(z.string()).default([]),
  })
  .strict();

export type CreateSpaceDTO = z.infer<typeof CreateSpaceDTO>;

export const UpdateSpaceDTO = z
  .object({
    name: z.string().min(1).optional(),
    type: spaceTypeEnum.optional(),
    capacity: z.number().int().positive().optional(),
    amenities: z.array(z.string()).optional(),
  })
  .strict();

export type UpdateSpaceDTO = z.infer<typeof UpdateSpaceDTO>;

export const ListSpacesQueryDTO = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    type: spaceTypeEnum.optional(),
    search: z.string().min(1).optional(),
  })
  .strict();

export type ListSpacesQueryDTO = z.infer<typeof ListSpacesQueryDTO>;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const SpaceAvailabilityQueryDTO = z
  .object({
    date: z.string().regex(isoDatePattern, "date must be in YYYY-MM-DD format"),
  })
  .strict();

export type SpaceAvailabilityQueryDTO = z.infer<typeof SpaceAvailabilityQueryDTO>;
