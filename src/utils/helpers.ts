import { ApiResponse, PaginationMeta } from '../types/apiTypes.js';

export const Helpers = {
  /**
   * Tạo cấu trúc response thành công chuẩn { data, meta? }
   */
  successResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
    if (meta) {
      return { data, meta };
    }
    return { data };
  },

  /**
   * Chuẩn hóa Open Library Key (ví dụ: "/works/OL82563W" -> "OL82563W")
   */
  extractWorkId(rawKey: string): string {
    if (!rawKey) return '';
    return rawKey.replace('/works/', '').replace(/^\/+|\/+$/g, '').trim();
  },

  /**
   * Trích xuất nội dung tóm tắt từ Open Library (xử lý trường hợp string hoặc object { type, value })
   */
  parseDescription(description?: string | { type?: string; value: string }): string | null {
    if (!description) return null;
    if (typeof description === 'string') return description.trim() || null;
    if (typeof description === 'object' && description.value) {
      return description.value.trim() || null;
    }
    return null;
  }
};

// Aliases tương thích cũ
export const successResponse = Helpers.successResponse;
export const extractWorkId = Helpers.extractWorkId;
export const parseDescription = Helpers.parseDescription;
