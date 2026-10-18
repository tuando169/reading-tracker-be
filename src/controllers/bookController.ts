import { Request, Response, NextFunction } from 'express';
import { bookService } from '../services/bookService.js';
import { helpers } from '../utils/helpers.js';

export const bookController = {
  async searchBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const keyword = String(req.query.keyword || '').trim();
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await bookService.searchBooks(keyword, page, limit);
      res.status(200).json(helpers.successResponse(result.data, result.meta));
    } catch (error) {
      next(error);
    }
  }
};
