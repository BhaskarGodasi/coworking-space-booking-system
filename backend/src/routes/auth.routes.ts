import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { authRateLimiter } from "../middlewares/rateLimiter";
import { RegisterDTO, LoginDTO } from "../dtos/auth.dto";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateRequest(RegisterDTO),
  authController.register,
);
authRouter.post("/login", authRateLimiter, validateRequest(LoginDTO), authController.login);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/logout", authRateLimiter, authController.logout);
