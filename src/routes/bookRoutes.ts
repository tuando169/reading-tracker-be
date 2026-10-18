import { Router } from 'express';
import { bookController } from '../controllers/bookController.js';
import { validateRequest } from '../middlewares/requestValidator.js';
import { bookValidation } from '../validations/bookValidation.js';

export const bookRouter = Router();

/**
 * @openapi
 * /books:
 *   get:
 *     summary: Tìm kiếm sách từ Open Library
 *     description: Proxy qua Open Library Search API và làm giàu trạng thái inLibrary qua MySQL
 *     tags:
 *       - Books
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (tên sách, tác giả)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng kết quả mỗi trang (tối đa 50)
 *     responses:
 *       200:
 *         description: Danh sách sách tìm thấy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BookSearchResult'
 *       400:
 *         description: Lỗi validation dữ liệu đầu vào
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
bookRouter.get(
  '/',
  validateRequest(bookValidation.searchBooks),
  bookController.searchBooks
);

