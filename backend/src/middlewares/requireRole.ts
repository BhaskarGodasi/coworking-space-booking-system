import { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";
import { RoleValue } from "../constants/roles";

export function requireRole(...allowedRoles: RoleValue[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role as RoleValue)) {
      return next(new ForbiddenError());
    }

    next();
  };
}
