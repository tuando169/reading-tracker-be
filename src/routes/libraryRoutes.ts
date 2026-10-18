import { Router } from 'express';
import { LibraryController } from '../controllers/libraryController.js';
import { validateRequest } from '../middlewares/requestValidator.js';
import { LibraryValidation } from '../validations/libraryValidation.js';

export const libraryRouter = Router();

/**
 * @openapi
 * /library:
 *   get:
 *     summary: Lấy danh sách sách trong tủ cá nhân
 *     description: Lọc theo trạng thái và phân trang, tính toán % tiến độ đọc
 *     tags:
 *       - Library
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1, 2]
 *         description: 0 (Muốn đọc), 1 (Đang đọc), 2 (Đã đọc). Không truyền = lấy tất cả.
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
 *         description: Số lượng sách mỗi trang (tối đa 50)
 *     responses:
 *       200:
 *         description: Danh sách sách trong tủ
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LibraryBook'
 */
libraryRouter.get(
  '/',
  validateRequest(LibraryValidation.getLibrary),
  LibraryController.getLibrary
);

/**
 * @openapi
 * /library:
 *   post:
 *     summary: Thêm sách vào tủ sách cá nhân
 *     description: Lấy metadata từ Open Library và lưu trữ vào MySQL
 *     tags:
 *       - Library
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddBookInput'
 *     responses:
 *       201:
 *         description: Thêm thành công
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/LibraryBook'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       409:
 *         description: Sách đã tồn tại trong tủ cá nhân
 */
libraryRouter.post(
  '/',
  validateRequest(LibraryValidation.addBook),
  LibraryController.addToLibrary
);

/**
 * @openapi
 * /library/{id}:
 *   patch:
 *     summary: Cập nhật tiến độ đọc, trạng thái, đánh giá hoặc ghi chú
 *     description: Tự động ghi nhận mốc started_at/finished_at và tự động hoàn thành khi đọc hết số trang
 *     tags:
 *       - Library
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID khóa chính bản ghi sách trong MySQL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProgressInput'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/LibraryBook'
 *       400:
 *         description: Dữ liệu không hợp lệ (ví dụ currentPage > totalPages)
 *       404:
 *         description: Không tìm thấy sách trong tủ
 */
libraryRouter.patch(
  '/:id',
  validateRequest(LibraryValidation.updateProgress),
  LibraryController.updateProgress
);

/**
 * @openapi
 * /library/{id}:
 *   delete:
 *     summary: Xóa sách khỏi tủ cá nhân
 *     tags:
 *       - Library
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID bản ghi sách trong MySQL
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     deleted:
 *                       type: boolean
 *       404:
 *         description: Không tìm thấy sách trong tủ
 */
libraryRouter.delete(
  '/:id',
  validateRequest(LibraryValidation.idParam),
  LibraryController.deleteFromLibrary
);
