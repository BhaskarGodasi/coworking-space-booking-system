import { Request, Response, NextFunction } from "express";
import { bookingService } from "../services/booking.service";

export const bookingController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  async listOwn(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await bookingService.listOwn(req.user!.userId);
      res.status(200).json({ success: true, data: bookings });
    } catch (err) {
      next(err);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as { status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" };
      const bookings = await bookingService.listAll(status);
      res.status(200).json({ success: true, data: bookings });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.cancel(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.approve(req.params.id);
      res.status(200).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await bookingService.reject(req.params.id);
      res.status(200).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },
};
