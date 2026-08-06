import { Router } from "express";
import { bookingController } from "../controllers/booking.controller";
import { validateRequest, validateQuery } from "../middlewares/validateRequest";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { ROLES } from "../constants/roles";
import { CreateBookingDTO, ListBookingsQueryDTO } from "../dtos/booking.dto";

export const bookingRouter = Router();

// RBAC Permission Matrix (Implementation Design v1.1) lists Create Booking
// and Cancel Own Booking as available to both Member and Admin.
const MEMBER_OR_ADMIN = [ROLES.MEMBER, ROLES.ADMIN] as const;

bookingRouter.post(
  "/",
  requireAuth,
  requireRole(...MEMBER_OR_ADMIN),
  validateRequest(CreateBookingDTO),
  bookingController.create,
);

bookingRouter.get("/me", requireAuth, requireRole(...MEMBER_OR_ADMIN), bookingController.listOwn);

bookingRouter.get(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validateQuery(ListBookingsQueryDTO),
  bookingController.listAll,
);

bookingRouter.put(
  "/:id/cancel",
  requireAuth,
  requireRole(...MEMBER_OR_ADMIN),
  bookingController.cancel,
);

bookingRouter.put(
  "/:id/approve",
  requireAuth,
  requireRole(ROLES.ADMIN),
  bookingController.approve,
);

bookingRouter.put("/:id/reject", requireAuth, requireRole(ROLES.ADMIN), bookingController.reject);
