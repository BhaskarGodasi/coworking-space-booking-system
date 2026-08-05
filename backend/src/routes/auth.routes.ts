import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { authRateLimiter } from "../middlewares/rateLimiter";
import { RegisterDto, LoginDto } from "../dtos/auth.dto";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateRequest(RegisterDto),
  authController.register,
);
authRouter.post("/login", authRateLimiter, validateRequest(LoginDto), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
