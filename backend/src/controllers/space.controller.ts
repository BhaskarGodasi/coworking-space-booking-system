import { Request, Response, NextFunction } from "express";
import { spaceService } from "../services/space.service";

export const spaceController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await spaceService.list(req.query as never);
      res.status(200).json({ success: true, data: result.data, meta: result.meta });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const space = await spaceService.getById(req.params.id);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  },

  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query as { date: string };
      const availability = await spaceService.getAvailability(req.params.id, date);
      res.status(200).json({ success: true, data: availability });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const space = await spaceService.create(req.body);
      res.status(201).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const space = await spaceService.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: space });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await spaceService.softDelete(req.params.id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
};
