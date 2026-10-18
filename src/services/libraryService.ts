import { libraryRepository } from '../repositories/libraryRepository.js';
import { openLibraryService } from './openLibraryService.js';
import { extractWorkId, parseDescription } from '../utils/helpers.js';
import {
  LibraryBookRecord,
  LibraryBookResponse,
  UpdateLibraryBookDTO
} from '../types/libraryTypes.js';
import { ReadingStatusEnum, ReadingStatusType } from '../config/constants.js';
import { PaginationMeta } from '../types/apiTypes.js';
import { AppError } from '../utils/appError.js';

export function formatLibraryResponse(record: LibraryBookRecord): LibraryBookResponse {
  return {
    id: record.id,
    workId: record.work_id,
    title: record.title,
    author: record.author,
    coverUrl: record.cover_url,
    description: record.description,
    publishYear: record.publish_year,
    status: record.status,
    currentPage: record.current_page,
    totalPages: record.total_pages,
    rating: record.rating,
    note: record.note,
    startedAt: record.started_at ? new Date(record.started_at).toISOString() : null,
    finishedAt: record.finished_at ? new Date(record.finished_at).toISOString() : null,
    createdAt: new Date(record.created_at).toISOString(),
    updatedAt: new Date(record.updated_at).toISOString()
  };
}

export const libraryService = {
  /**
   * Thêm sách vào tủ cá nhân
   */
  async addToLibrary(workId: string, status: ReadingStatusType = ReadingStatusEnum.NotRead): Promise<LibraryBookResponse> {
    const cleanId = extractWorkId(workId);

    // 1. Kiểm tra tồn tại trong DB
    const existing = await libraryRepository.findByWorkId(cleanId);
    if (existing) {
      throw new AppError(409, 'BOOK_ALREADY_EXISTS', 'Sách đã tồn tại trong tủ sách cá nhân');
    }

    // 2. Fetch metadata từ Open Library
    const workData = await openLibraryService.getWorkDetail(cleanId);
    let title = 'Không có tiêu đề';
    let author: string | null = null;
    let coverUrl: string | null = null;
    let description: string | null = null;
    let publishYear: number | null = null;
    let totalPages: number | null = null;
    let subjects: string[] = [];

    if (workData) {
      title = workData.title || title;
      description = parseDescription(workData.description);
      const coverId = Array.isArray(workData.covers) && workData.covers.length > 0 ? workData.covers[0] : undefined;
      coverUrl = openLibraryService.buildCoverUrl(coverId);
      subjects = Array.isArray(workData.subjects) ? workData.subjects.slice(0, 10) : [];
      if (workData.first_publish_date) {
        const match = workData.first_publish_date.match(/\b\d{4}\b/);
        if (match) publishYear = parseInt(match[0], 10);
      }
    }

    // Tra cứu thêm số trang và tên tác giả từ search API nếu work detail thiếu
    try {
      const searchRes = await openLibraryService.searchBooks(title, 1, 5);
      const matched = searchRes.docs.find((d) => extractWorkId(d.key) === cleanId);
      if (matched) {
        if (!author && matched.author_name?.length) {
          author = matched.author_name.join(', ');
        }
        if (!totalPages && matched.number_of_pages_median) {
          totalPages = matched.number_of_pages_median;
        }
        if (!publishYear && matched.first_publish_year) {
          publishYear = matched.first_publish_year;
        }
        if (!coverUrl && matched.cover_i) {
          coverUrl = openLibraryService.buildCoverUrl(matched.cover_i);
        }
      }
    } catch {
      // Bỏ qua lỗi fallback
    }

    // 3. Thêm vào MySQL
    const newId = await libraryRepository.create({
      workId: cleanId,
      title,
      author,
      coverUrl,
      description,
      publishYear,
      totalPages,
      subjects,
      status
    });

    const createdRecord = await libraryRepository.findById(newId);
    if (!createdRecord) {
      throw new AppError(500, 'CREATE_FAILED', 'Không thể tạo bản ghi tủ sách');
    }

    return formatLibraryResponse(createdRecord);
  },

  /**
   * Lấy danh sách tủ sách có phân trang
   */
  async getLibrary(
    status?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: LibraryBookResponse[]; meta: PaginationMeta }> {
    const { items, total } = await libraryRepository.findMany(status, page, limit);
    const data = items.map(formatLibraryResponse);
    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  },

  /**
   * Cập nhật tiến độ, đánh giá, ghi chú và tự động chuyển trạng thái
   */
  async updateProgress(id: number, payload: UpdateLibraryBookDTO): Promise<LibraryBookResponse> {
    const currentRecord = await libraryRepository.findById(id);
    if (!currentRecord) {
      throw new AppError(404, 'BOOK_NOT_FOUND', `Không tìm thấy sách trong tủ với id ${id}`);
    }

    const totalPages = currentRecord.total_pages;
    const targetPage = payload.currentPage !== undefined ? payload.currentPage : currentRecord.current_page;

    // Validate currentPage không vượt quá totalPages nếu totalPages tồn tại
    if (totalPages && totalPages > 0 && targetPage > totalPages) {
      throw new AppError(400, 'INVALID_PAGE', `Số trang hiện tại (${targetPage}) không được vượt quá tổng số trang (${totalPages})`);
    }

    let nextStatus = payload.status !== undefined ? payload.status : currentRecord.status;

    // Tự động hoàn thành nếu đọc hết trang
    if (totalPages && totalPages > 0 && targetPage >= totalPages) {
      nextStatus = ReadingStatusEnum.Completed;
    }

    let startedAt = currentRecord.started_at ? new Date(currentRecord.started_at) : null;
    let finishedAt = currentRecord.finished_at ? new Date(currentRecord.finished_at) : null;

    // Lần đầu chuyển sang ĐANG ĐỌC (status = 1) -> ghi nhận started_at
    if (nextStatus === ReadingStatusEnum.Reading && !startedAt) {
      startedAt = new Date();
    }

    // Chuyển sang ĐÃ ĐỌC (status = 2) -> ghi nhận finished_at
    if (nextStatus === ReadingStatusEnum.Completed) {
      if (!finishedAt) finishedAt = new Date();
    } else if (payload.status !== undefined && payload.status < ReadingStatusEnum.Completed) {
      // Chuyển lùi về Muốn đọc hoặc Đang đọc -> reset finished_at = null
      finishedAt = null;
    }

    await libraryRepository.update(id, {
      status: nextStatus,
      currentPage: payload.currentPage,
      rating: payload.rating,
      note: payload.note,
      startedAt,
      finishedAt
    });

    const updatedRecord = await libraryRepository.findById(id);
    if (!updatedRecord) {
      throw new AppError(500, 'UPDATE_FAILED', 'Không thể lấy thông tin cập nhật');
    }

    return formatLibraryResponse(updatedRecord);
  },

  /**
   * Xóa sách khỏi tủ cá nhân
   */
  async deleteFromLibrary(id: number): Promise<{ id: number; deleted: boolean }> {
    const existing = await libraryRepository.findById(id);
    if (!existing) {
      throw new AppError(404, 'BOOK_NOT_FOUND', `Không tìm thấy sách trong tủ với id ${id}`);
    }

    const success = await libraryRepository.delete(id);
    if (!success) {
      throw new AppError(500, 'DELETE_FAILED', 'Không thể xóa sách khỏi tủ');
    }

    return { id, deleted: true };
  }
};
