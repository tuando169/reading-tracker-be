import { Router } from "express";
import { libraryController } from "../controllers/libraryController.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import { libraryValidation } from "../validations/libraryValidation.js";

export const libraryRouter = Router();

/**
 * @openapi
 * /library:
 *   get:
 *     summary: Lấy toàn bộ danh sách sách trong tủ cá nhân
 *     description: Lấy tất cả các sách trong thư viện
 *     tags:
 *       - Library
 *     responses:
 *       200:
 *         description: Danh sách toàn bộ sách trong tủ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LibraryBook'
 */
libraryRouter.get("/", libraryController.getLibrary);

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
  "/",
  validateRequest(libraryValidation.addBook),
  libraryController.addToLibrary,
);

/**
 * @openapi
 * /library:
 *   patch:
 *     summary: Cập nhật tiến độ đọc, trạng thái, đánh giá hoặc ghi chú
 *     description: Tự động ghi nhận mốc started_at/finished_at và tự động hoàn thành khi đọc hết số trang
 *     tags:
 *       - Library
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
  "/",
  validateRequest(libraryValidation.updateProgress),
  libraryController.updateProgress,
);

libraryRouter.patch(
  "/:id",
  validateRequest(libraryValidation.updateProgress),
  libraryController.updateProgress,
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
 *           type: string
 *         description: ID sách (ví dụ OL82563W)
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
 *                       type: string
 *                     deleted:
 *                       type: boolean
 *       404:
 *         description: Không tìm thấy sách trong tủ
 */
libraryRouter.delete(
  "/:id",
  validateRequest(libraryValidation.idParam),
  libraryController.deleteFromLibrary,
);
