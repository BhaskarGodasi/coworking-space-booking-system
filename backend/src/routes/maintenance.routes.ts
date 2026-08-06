import { Router } from "express";
import { maintenanceController } from "../controllers/maintenance.controller";
import { validateRequest, validateQuery } from "../middlewares/validateRequest";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ROLES } from "../constants/roles";
import { CreateMaintenanceDTO, ListMaintenanceQueryDTO } from "../dtos/maintenance.dto";

export const maintenanceRouter = Router();

// RBAC Permission Matrix (Implementation Design v1.1): "Manage Maintenance"
// is Admin-only.
maintenanceRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validateRequest(CreateMaintenanceDTO),
  maintenanceController.create,
);

maintenanceRouter.get(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validateQuery(ListMaintenanceQueryDTO),
  maintenanceController.listAll,
);

maintenanceRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  maintenanceController.remove,
);
