import { z } from 'zod';

export const LibraryValidation = {
  addBook: z.object({
    body: z.object({
      workId: z.string().trim().min(1, 'workId không được để trống'),
      status: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0)
    })
  }),

  getLibrary: z.object({
    query: z.object({
      status: z.coerce.number().int().refine((val) => [0, 1, 2].includes(val), {
        message: 'status phải là 0 (Muốn đọc), 1 (Đang đọc) hoặc 2 (Đã đọc)'
      }).optional(),
      page: z.coerce.number().int().min(1, 'Số trang phải lớn hơn hoặc bằng 1').default(1),
      limit: z.coerce.number().int().min(1, 'Giới hạn số lượng phải lớn hơn hoặc bằng 1').max(50, 'Giới hạn số lượng tối đa 50').default(20)
    })
  }),

  idParam: z.object({
    params: z.object({
      id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương')
    })
  }),

  updateProgress: z.object({
    params: z.object({
      id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương')
    }),
    body: z.object({
      status: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
      currentPage: z.number().int().min(0, 'Trang hiện tại phải >= 0').optional(),
      rating: z.number().int().min(0).max(5, 'Điểm đánh giá phải từ 0 đến 5').optional(),
      note: z.string().max(2000, 'Ghi chú tối đa 2000 ký tự').optional()
    }).refine((data) => Object.keys(data).length > 0, {
      message: 'Cần gửi ít nhất một trường để cập nhật (status, currentPage, rating, note)'
    })
  })
};
