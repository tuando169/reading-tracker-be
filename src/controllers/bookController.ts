import { Request, Response, NextFunction } from 'express';
import { bookService } from '../services/bookService.js';
import { Helpers } from '../utils/helpers.js';

export const BookController = {
  async searchBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keyword = String(req.query.keyword || '').trim();
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await bookService.searchBooks(keyword, page, limit);
      res.status(200).json(Helpers.successResponse(result.data, result.meta));
    } catch (error) {
      next(error);
    }
  },

  async getBookDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workId = String(req.params.workId);
      const result = await bookService.getBookDetail(workId);
      res.status(200).json(Helpers.successResponse(result));
    } catch (error) {
      next(error);
    }
  }
};
