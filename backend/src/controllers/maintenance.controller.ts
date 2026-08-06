import { Request, Response, NextFunction } from "express";
import { maintenanceService } from "../services/maintenance.service";

export const maintenanceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const maintenance = await maintenanceService.create(req.body);
      res.status(201).json({ success: true, data: maintenance });
    } catch (err) {
      next(err);
    }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { spaceId } = req.query as { spaceId?: string };
      const maintenances = await maintenanceService.listAll(spaceId);
      res.status(200).json({ success: true, data: maintenances });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await maintenanceService.remove(req.params.id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
};
