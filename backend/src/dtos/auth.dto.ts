import { z } from "zod";

export const RegisterDto = z
  .object({
    email: z.string().email().transform((val) => val.toLowerCase()),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterDto>;

export const LoginDto = z
  .object({
    email: z.string().email().transform((val) => val.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export type LoginDto = z.infer<typeof LoginDto>;
