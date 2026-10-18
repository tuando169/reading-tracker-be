import { z } from "zod";

export const libraryValidation = {
  addBook: z.object({
    body: z.object({
      id: z.string().trim().min(1, "ID sách không được để trống"),
      status: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
    }),
  }),

  getLibrary: z.object({
    query: z.object({
      status: z.coerce
        .number()
        .int()
        .refine((val) => [0, 1, 2].includes(val), {
          message: "status phải là 0 (Muốn đọc), 1 (Đang đọc) hoặc 2 (Đã đọc)",
        })
        .optional(),
      page: z.coerce
        .number()
        .int()
        .min(1, "Số trang phải lớn hơn hoặc bằng 1")
        .default(1),
      limit: z.coerce
        .number()
        .int()
        .min(1, "Giới hạn số lượng phải lớn hơn hoặc bằng 1")
        .max(50, "Giới hạn số lượng tối đa 50")
        .default(20),
    }),
  }),

  idParam: z.object({
    params: z.object({
      id: z.string().trim().min(1, "ID không được để trống"),
    }),
  }),

  updateProgress: z.object({
    body: z
      .object({
        id: z.string().trim().min(1, "ID sách không được để trống"),
        currentPage: z
          .number({
            invalid_type_error: "Trang hiện tại phải là số nguyên",
          })
          .int()
          .min(0, "Trang hiện tại phải lớn hơn hoặc bằng 0")
          .optional(),
        rating: z
          .number({
            invalid_type_error:
              "Điểm đánh giá phải là số nguyên từ 0 đến 5, không nhận null",
          })
          .int()
          .min(0, "Điểm đánh giá phải từ 0 đến 5")
          .max(5, "Điểm đánh giá phải từ 0 đến 5")
          .optional(),
        note: z
          .string({
            invalid_type_error: "Ghi chú phải là chuỗi ký tự, không nhận null",
          })
          .max(2000, "Ghi chú tối đa 2000 ký tự")
          .optional(),
      })
      .refine(
        (data) => {
          const { id, ...updates } = data;
          return Object.keys(updates).length > 0;
        },
        {
          message:
            "Cần gửi ít nhất một trường để cập nhật (currentPage, rating, note)",
        },
      ),
  }),
};
