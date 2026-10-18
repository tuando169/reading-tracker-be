import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

  // 1. Lỗi Validation từ Zod
  if (err instanceof ZodError) {
    const details = err.errors.reduce((acc: Record<string, string>, cur) => {
      const field = cur.path.slice(1).join('.');
      acc[field || 'request'] = cur.message;
      return acc;
    }, {});

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu gửi lên không hợp lệ',
        details
      }
    });
    return;
  }

  // 2. Lỗi nghiệp vụ tùy biến (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // 3. Lỗi trùng lặp UNIQUE key trong MySQL (ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      error: {
        code: 'BOOK_ALREADY_EXISTS',
        message: 'Sách đã tồn tại trong tủ sách cá nhân'
      }
    });
    return;
  }

  // 4. Lỗi mặc định Server 500
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
    }
  });
}
