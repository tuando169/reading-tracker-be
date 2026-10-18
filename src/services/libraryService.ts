import { libraryRepository } from "../repositories/libraryRepository.js";
import { openLibraryService } from "./openLibraryService.js";
import { helpers } from "../utils/helpers.js";
import {
  LibraryBookRecord,
  LibraryBookResponse,
  UpdateLibraryBookDTO,
} from "../types/libraryTypes.js";
import { ReadingStatusEnum, ReadingStatusType } from "../config/constants.js";
import { PaginationMeta } from "../types/apiTypes.js";
import { AppError } from "../utils/appError.js";

export const libraryService = {
  async addToLibrary(
    id: string,
    status: ReadingStatusType = ReadingStatusEnum.NotRead,
  ): Promise<LibraryBookResponse> {
    const cleanId = helpers.extractWorkId(id);

    const existing = await libraryRepository.findById(cleanId);
    if (existing) {
      throw new AppError(
        409,
        "BOOK_ALREADY_EXISTS",
        "Sách đã tồn tại trong tủ sách cá nhân",
      );
    }

    const workData = await openLibraryService.getWorkDetail(cleanId);
    let title = "Không có tiêu đề";
    let author: string | null = null;
    let coverUrl: string | null = null;
    let description: string | null = null;
    let publishYear: number | null = null;
    let totalPages: number | null = null;
    let subjects: string[] = [];

    if (!workData)
      throw new AppError(404, "BOOK_NOT_FOUND", "Không tìm thấy sách");

    title = workData.title || title;
    description = helpers.parseDescription(workData.description);
    const coverId =
      Array.isArray(workData.covers) && workData.covers.length > 0
        ? workData.covers[0]
        : undefined;
    coverUrl = openLibraryService.buildCoverUrl(coverId);
    subjects = Array.isArray(workData.subjects)
      ? workData.subjects.slice(0, 10)
      : [];
    if (workData.first_publish_date) {
      const match = workData.first_publish_date.match(/\b\d{4}\b/);
      if (match) publishYear = parseInt(match[0], 10);
    }

    try {
      const searchRes = await openLibraryService.searchBooks(title, 1, 5);
      const matched = searchRes.docs.find(
        (d) => helpers.extractWorkId(d.key) === cleanId,
      );
      if (matched) {
        if (!author && matched.author_name?.length) {
          author = matched.author_name.join(", ");
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
    } catch {}

    const currentPage =
      status === ReadingStatusEnum.Completed && totalPages ? totalPages : 0;

    await libraryRepository.create({
      id: cleanId,
      title,
      author,
      coverUrl,
      description,
      publishYear,
      totalPages,
      subjects,
      status,
      currentPage,
    });

    const createdRecord = await libraryRepository.findById(cleanId);
    if (!createdRecord) {
      throw new AppError(500, "CREATE_FAILED", "Không thể tạo bản ghi tủ sách");
    }

    return formatLibraryResponse(createdRecord);
  },

  async getLibrary(): Promise<LibraryBookResponse[]> {
    const items = await libraryRepository.getAll();
    return items.map(formatLibraryResponse);
  },

  async updateProgress(
    payload: UpdateLibraryBookDTO,
  ): Promise<LibraryBookResponse> {
    const { id } = payload;
    const currentRecord = await libraryRepository.findById(id);
    if (!currentRecord) {
      throw new AppError(
        404,
        "BOOK_NOT_FOUND",
        `Không tìm thấy sách trong tủ với id ${id}`,
      );
    }

    const totalPages = currentRecord.total_pages;
    const targetPage =
      payload.currentPage !== undefined
        ? payload.currentPage
        : currentRecord.current_page;

    // Validate currentPage không vượt quá totalPages nếu totalPages tồn tại
    if (totalPages && totalPages > 0 && targetPage > totalPages) {
      throw new AppError(
        400,
        "INVALID_PAGE",
        `Số trang hiện tại (${targetPage}) không được vượt quá tổng số trang (${totalPages})`,
      );
    }

    let nextStatus = currentRecord.status;
    let startedAt = currentRecord.started_at
      ? new Date(currentRecord.started_at)
      : null;
    let finishedAt = currentRecord.finished_at
      ? new Date(currentRecord.finished_at)
      : null;

    // Tự động tính toán status dựa trên currentPage
    if (payload.currentPage !== undefined) {
      if (targetPage === 0) {
        nextStatus = ReadingStatusEnum.NotRead;
        finishedAt = null;
      } else if (totalPages && totalPages > 0 && targetPage >= totalPages) {
        nextStatus = ReadingStatusEnum.Completed;
        if (!finishedAt) finishedAt = new Date();
      } else {
        nextStatus = ReadingStatusEnum.Reading;
        finishedAt = null;
        if (!startedAt) startedAt = new Date();
      }
    }

    await libraryRepository.update(id, {
      status: nextStatus,
      currentPage: payload.currentPage,
      rating: payload.rating,
      note: payload.note,
      startedAt,
      finishedAt,
    });

    const updatedRecord = await libraryRepository.findById(id);
    if (!updatedRecord) {
      throw new AppError(
        500,
        "UPDATE_FAILED",
        "Không thể lấy thông tin cập nhật",
      );
    }

    return formatLibraryResponse(updatedRecord);
  },

  /**
   * Xóa sách khỏi tủ cá nhân
   */
  async deleteFromLibrary(
    id: string,
  ): Promise<{ id: string; deleted: boolean }> {
    const existing = await libraryRepository.findById(id);
    if (!existing) {
      throw new AppError(
        404,
        "BOOK_NOT_FOUND",
        `Không tìm thấy sách trong tủ với id ${id}`,
      );
    }

    const success = await libraryRepository.delete(id);
    if (!success) {
      throw new AppError(500, "DELETE_FAILED", "Không thể xóa sách khỏi tủ");
    }

    return { id, deleted: true };
  },
};

function formatLibraryResponse(record: LibraryBookRecord): LibraryBookResponse {
  const totalPages = record.total_pages;
  const currentPage = record.current_page || 0;
  let progressPercent = 0;
  if (totalPages && totalPages > 0) {
    progressPercent = Math.min(
      100,
      Math.round((currentPage / totalPages) * 10000) / 100,
    );
  }

  return {
    id: record.id,
    title: record.title,
    author: record.author,
    coverUrl: record.cover_url,
    description: record.description,
    publishYear: record.publish_year,
    subjects: helpers.parseSubjects(record.subjects),
    status: record.status,
    currentPage,
    totalPages,
    progressPercent,
    rating: typeof record.rating === "number" ? record.rating : 0,
    note: typeof record.note === "string" ? record.note : "",
    startedAt: record.started_at
      ? new Date(record.started_at).toISOString()
      : null,
    finishedAt: record.finished_at
      ? new Date(record.finished_at).toISOString()
      : null,
    createdAt: new Date(record.created_at).toISOString(),
    updatedAt: new Date(record.updated_at).toISOString(),
  };
}
