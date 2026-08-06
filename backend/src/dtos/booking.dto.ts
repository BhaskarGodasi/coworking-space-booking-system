import { z } from "zod";

const isoDateTimeWithOffset = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), "must be a valid ISO-8601 date-time")
  .refine((val) => /(Z|[+-]\d{2}:\d{2})$/.test(val), "must include a UTC offset (e.g. Z)");

export const CreateBookingDTO = z
  .object({
    spaceId: z.string().uuid(),
    startTime: isoDateTimeWithOffset,
    endTime: isoDateTimeWithOffset,
  })
  .strict()
  .refine((data) => new Date(data.startTime).getTime() > Date.now(), {
    message: "startTime must be in the future",
    path: ["startTime"],
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export type CreateBookingDTO = z.infer<typeof CreateBookingDTO>;

const bookingStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

export const ListBookingsQueryDTO = z
  .object({
    status: bookingStatusEnum.optional(),
  })
  .strict();

export type ListBookingsQueryDTO = z.infer<typeof ListBookingsQueryDTO>;
