import { z } from 'zod';

export const bookValidation = {
  searchBooks: z.object({
    query: z.object({
      keyword: z.string().trim().min(3, 'Từ khóa tìm kiếm phải có ít nhất 3 ký tự'),
      page: z.coerce.number().int().min(1, 'Số trang phải lớn hơn hoặc bằng 1').default(1),
      limit: z.coerce.number().int().min(1, 'Giới hạn số lượng phải lớn hơn hoặc bằng 1').max(50, 'Giới hạn số lượng tối đa 50').default(10)
    })
  }),

  workIdParam: z.object({
    params: z.object({
      workId: z.string().trim().min(1, 'workId không được để trống')
    })
  })
};

