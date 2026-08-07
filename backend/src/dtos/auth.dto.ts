import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const nonBlankName = z
  .string()
  .min(1)
  .refine((val) => val.trim().length > 0, "Must not be blank");

export const RegisterDTO = z
  .object({
    email: z.string().email().transform((val) => val.toLowerCase()),
    password: strongPassword,
    firstName: nonBlankName,
    lastName: nonBlankName,
  })
  .strict();

export type RegisterDTO = z.infer<typeof RegisterDTO>;

export const LoginDTO = z
  .object({
    email: z.string().email().transform((val) => val.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export type LoginDTO = z.infer<typeof LoginDTO>;
