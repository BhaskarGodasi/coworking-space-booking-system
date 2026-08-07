import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { env } from "../config/env";
import { parseDurationToMs } from "../utils/jwt.utils";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  // Without this, the cookie has no expiry of its own and the browser
  // treats it as a session cookie -- cleared on browser close regardless
  // of the token's real 7-day server-side lifetime (refreshTokenExpiryDate
  // uses this same REFRESH_EXPIRES_IN value). That silently turned
  // "stay logged in for a week" into "logged in until you close the
  // browser," which is not what REFRESH_EXPIRES_IN=7d is documented to
  // mean. maxAge keeps the cookie's client-side lifetime in sync with the
  // DB row's actual expiry.
  maxAge: parseDurationToMs(env.REFRESH_EXPIRES_IN),
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
      // Only touch cookie state when a cookie was actually presented. A
      // cross-site request (a hidden auto-submitting <form> on another
      // origin) can reach this route with no Cookie header at all --
      // SameSite=Strict correctly stops the browser from attaching the
      // real cookie to it -- but unconditionally calling clearCookie
      // regardless still returns a Set-Cookie that clears whatever
      // refreshToken cookie the victim's browser already holds for this
      // site, forcing a logout the user never asked for. There is no
      // session to end here, so the response should not mutate any
      // client-side cookie state.
      if (presentedToken) {
        await authService.logout(presentedToken);
        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      }
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
};
