import { Router } from "express";
import { spaceController } from "../controllers/space.controller";
import { validateRequest, validateQuery } from "../middlewares/validateRequest";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ROLES } from "../constants/roles";
import {
  CreateSpaceDTO,
  UpdateSpaceDTO,
  ListSpacesQueryDTO,
  SpaceAvailabilityQueryDTO,
} from "../dtos/space.dto";

export const spaceRouter = Router();

spaceRouter.get(
  "/deleted",
  requireAuth,
  requireRole(ROLES.ADMIN),
  spaceController.listDeleted,
);
spaceRouter.get("/", validateQuery(ListSpacesQueryDTO), spaceController.list);
spaceRouter.get("/:id", spaceController.getById);
spaceRouter.get(
  "/:id/availability",
  validateQuery(SpaceAvailabilityQueryDTO),
  spaceController.getAvailability,
);

spaceRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validateRequest(CreateSpaceDTO),
  spaceController.create,
);
spaceRouter.put(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validateRequest(UpdateSpaceDTO),
  spaceController.update,
);
spaceRouter.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), spaceController.remove);
spaceRouter.put(
  "/:id/restore",
  requireAuth,
  requireRole(ROLES.ADMIN),
  spaceController.restore,
);
