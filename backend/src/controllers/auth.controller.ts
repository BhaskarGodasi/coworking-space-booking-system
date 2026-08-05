import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { env } from "../config/env";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken, refreshToken, user } = await authService.login(req.body);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      res.status(200).json({ success: true, data: { accessToken, user } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const presentedToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (!presentedToken) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Refresh token missing", details: [] },
        });
      }

      const { accessToken, refreshToken } = await authService.refresh(presentedToken);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      res.status(200).json({ success: true, data: { accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const presentedToken = req.cookies?.[REFRESH_COOKIE_NAME];
      if (presentedToken) {
        await authService.logout(presentedToken);
      }
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
};
