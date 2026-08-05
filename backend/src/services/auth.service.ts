import { userRepository } from "../repositories/user.repository";
import { refreshTokenRepository } from "../repositories/refreshToken.repository";
import { hashPassword, comparePassword } from "../utils/password";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
} from "../utils/jwt.utils";
import { ConflictError, UnauthorizedError } from "../errors/AppError";
import { RegisterDto, LoginDto } from "../dtos/auth.dto";

export const authService = {
  async register(input: RegisterDto) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    return sanitizeUser(user);
  },

  async login(input: LoginDto) {
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
    const stored = await refreshTokenRepository.findByToken(presentedToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await userRepository.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Rotation: the presented token is single-use.
    await refreshTokenRepository.deleteByToken(presentedToken);

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  async logout(presentedToken: string) {
    await refreshTokenRepository.deleteByToken(presentedToken);
  },
};

async function issueRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken();
  await refreshTokenRepository.create(userId, token, refreshTokenExpiryDate());
  return token;
}

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
