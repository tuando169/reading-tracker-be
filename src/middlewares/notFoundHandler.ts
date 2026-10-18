import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `Đường dẫn ${req.method} ${req.originalUrl} không tồn tại`));
}
