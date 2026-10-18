import { Request, Response, NextFunction } from 'express';
import { libraryService } from '../services/libraryService.js';
import { Helpers } from '../utils/helpers.js';

export const LibraryController = {
  async addToLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workId, status } = req.body;
      const result = await libraryService.addToLibrary(workId, status);
      res.status(201).json(Helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async getLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status !== undefined ? parseInt(String(req.query.status), 10) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await libraryService.getLibrary(status, page, limit);
      res.status(200).json(Helpers.successResponse(result.data, result.meta));
    } catch (error) {
      next(error);
    }
  },

  async updateProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const result = await libraryService.updateProgress(id, req.body);
      res.status(200).json(Helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async deleteFromLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      const result = await libraryService.deleteFromLibrary(id);
      res.status(200).json(Helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  }
};
