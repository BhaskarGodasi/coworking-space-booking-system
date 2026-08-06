import { Prisma } from "@prisma/client";
import { prisma } from "../repositories/prisma";
import { userRepository } from "../repositories/user.repository";
import { refreshTokenRepository } from "../repositories/refreshToken.repository";
import { hashPassword, comparePassword } from "../utils/password";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
  hashRefreshToken,
} from "../utils/jwt.utils";
import { ConflictError, UnauthorizedError } from "../errors/AppError";
import { RegisterDTO, LoginDTO } from "../dtos/auth.dto";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export const authService = {
  async register(input: RegisterDTO) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const user = await userRepository.create({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      return sanitizeUser(user);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictError("An account with this email already exists");
      }
      throw err;
    }
  },

  async login(input: LoginDTO) {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const passwordMatches = await comparePassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  async refresh(presentedToken: string) {
    const presentedHash = hashRefreshToken(presentedToken);

    const result = await prisma.$transaction(async (tx) => {
      // Atomically consume the presented token: the row-level delete lock
      // guarantees that of any two concurrent requests presenting the same
      // token, exactly one observes a non-null result. The other gets null
      // and is rejected, so a single token can only ever produce one
      // successor.
      const consumed = await refreshTokenRepository.consumeToken(presentedHash, tx);
      if (!consumed || consumed.expiresAt < new Date()) {
        throw new UnauthorizedError("Invalid or expired refresh token");
      }

      const user = await userRepository.findById(consumed.userId, tx);
      if (!user || !user.isActive) {
        throw new UnauthorizedError("Invalid or expired refresh token");
      }

      const newToken = generateRefreshToken();
      await refreshTokenRepository.create(
        user.id,
        hashRefreshToken(newToken),
        refreshTokenExpiryDate(),
        tx,
      );

      return { user, refreshToken: newToken };
    });

    const accessToken = signAccessToken({ userId: result.user.id, role: result.user.role });
    return {
      accessToken,
      refreshToken: result.refreshToken,
      user: sanitizeUser(result.user),
    };
  },

  async logout(presentedToken: string) {
    await refreshTokenRepository.deleteByToken(hashRefreshToken(presentedToken));
  },
};

async function issueRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken();
  await refreshTokenRepository.create(userId, hashRefreshToken(token), refreshTokenExpiryDate());
  return token;
}

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
