import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export const userRepository = {
  findByEmail(email: string, client: PrismaClientOrTx = prisma) {
    return client.user.findUnique({ where: { email } });
  },

  findById(id: string, client: PrismaClientOrTx = prisma) {
    return client.user.findUnique({ where: { id } });
  },

  create(input: CreateUserInput, client: PrismaClientOrTx = prisma) {
    return client.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });
  },
};
