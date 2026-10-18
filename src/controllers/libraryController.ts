import { Request, Response, NextFunction } from "express";
import { libraryService } from "../services/libraryService.js";
import { helpers } from "../utils/helpers.js";
import { AppError } from "../utils/appError.js";

export const libraryController = {
  async addToLibrary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id, status } = req.body;
      const result = await libraryService.addToLibrary(id, status);
      res.status(201).json(helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async getLibrary(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const books = await libraryService.getLibrary();
      res.status(200).json(helpers.successResponse(books));
    } catch (error) {
      next(error);
    }
  },

  async updateProgress(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = String(req.body?.id || "").trim();
      if (!id) {
        throw new AppError(
          404,
          "BOOK_NOT_FOUND",
          "Không tìm thấy sách trong tủ sách",
        );
      }

      const payload = {
        ...req.body,
        id,
      };
      const result = await libraryService.updateProgress(payload);
      res.status(200).json(helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async deleteFromLibrary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = String(req.params?.id || "").trim();
      if (!id) {
        throw new AppError(
          404,
          "BOOK_NOT_FOUND",
          "Không tìm thấy sách trong tủ sách",
        );
      }

      const result = await libraryService.deleteFromLibrary(id);
      res.status(200).json(helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
