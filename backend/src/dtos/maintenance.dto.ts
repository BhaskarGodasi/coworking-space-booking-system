import { z } from "zod";

const isoDateTimeWithOffset = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), "must be a valid ISO-8601 date-time")
  .refine((val) => /(Z|[+-]\d{2}:\d{2})$/.test(val), "must include a UTC offset (e.g. Z)");

export const CreateMaintenanceDTO = z
  .object({
    spaceId: z.string().uuid(),
    startTime: isoDateTimeWithOffset,
    endTime: isoDateTimeWithOffset,
    reason: z.string().min(1),
  })
  .strict()
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export type CreateMaintenanceDTO = z.infer<typeof CreateMaintenanceDTO>;

export const ListMaintenanceQueryDTO = z
  .object({
    spaceId: z.string().uuid().optional(),
  })
  .strict();

export type ListMaintenanceQueryDTO = z.infer<typeof ListMaintenanceQueryDTO>;
