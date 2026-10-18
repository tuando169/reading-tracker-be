import { openLibraryService } from './openLibraryService.js';
import { helpers } from '../utils/helpers.js';
import { libraryRepository } from '../repositories/libraryRepository.js';
import { BookSearchResultItem, BookDetail } from '../types/bookTypes.js';
import { PaginationMeta } from '../types/apiTypes.js';
import { AppError } from '../utils/appError.js';

export const bookService = {
  /**
   * Tìm kiếm sách và làm giàu trạng thái inLibrary qua MySQL
   */
  async searchBooks(
    keyword: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: BookSearchResultItem[]; meta: PaginationMeta }> {
    const rawResult = await openLibraryService.searchBooks(keyword, page, limit);

    const items = rawResult.docs.map((doc) => {
      const workId = helpers.extractWorkId(doc.key);
      const author = Array.isArray(doc.author_name) && doc.author_name.length > 0
        ? doc.author_name.join(', ')
        : null;
      const coverUrl = openLibraryService.buildCoverUrl(doc.cover_i);

      return {
        id: null as number | null,
        workId,
        title: doc.title || 'Không có tiêu đề',
        author,
        publishYear: doc.first_publish_year || null,
        coverUrl,
        inLibrary: false
      };
    });

    const workIds = items.map((item) => item.workId).filter(Boolean);
    const existingBooks = await libraryRepository.findByWorkIds(workIds);

    const existingMap = new Map<string, number>();
    for (const b of existingBooks) {
      existingMap.set(b.work_id, b.id);
    }

    for (const item of items) {
      if (existingMap.has(item.workId)) {
        item.inLibrary = true;
        item.id = existingMap.get(item.workId)!;
      }
    }

    const total = rawResult.numFound || 0;
    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  },

  /**
   * Xem chi tiết sách: ưu tiên từ DB MySQL nếu đã có, fallback sang Open Library
   */
  async getBookDetail(workId: string): Promise<BookDetail> {
    const cleanId = helpers.extractWorkId(workId);

    // 1. Kiểm tra trong DB MySQL
    const dbRecord = await libraryRepository.findByWorkId(cleanId);
    if (dbRecord) {
      let subjects: string[] = [];
      if (typeof dbRecord.subjects === 'string') {
        try {
          subjects = JSON.parse(dbRecord.subjects);
        } catch {
          subjects = [];
        }
      } else if (Array.isArray(dbRecord.subjects)) {
        subjects = dbRecord.subjects;
      }

      return {
        id: dbRecord.id,
        workId: dbRecord.work_id,
        title: dbRecord.title,
        author: dbRecord.author,
        description: dbRecord.description,
        publishYear: dbRecord.publish_year,
        totalPages: dbRecord.total_pages,
        subjects,
        coverUrl: dbRecord.cover_url,
        inLibrary: true,
        status: dbRecord.status,
        currentPage: dbRecord.current_page,
        rating: dbRecord.rating,
        note: dbRecord.note
      };
    }

    // 2. Nếu chưa có trong MySQL, gọi Open Library
    const workData = await openLibraryService.getWorkDetail(cleanId);
    if (!workData) {
      throw new AppError(404, 'BOOK_NOT_FOUND', `Không tìm thấy tác phẩm với workId "${cleanId}"`);
    }

    const coverId = Array.isArray(workData.covers) && workData.covers.length > 0 ? workData.covers[0] : undefined;
    const coverUrl = openLibraryService.buildCoverUrl(coverId);
    const description = helpers.parseDescription(workData.description);

    let publishYear: number | null = null;
    if (workData.first_publish_date) {
      const match = workData.first_publish_date.match(/\b\d{4}\b/);
      if (match) publishYear = parseInt(match[0], 10);
    }

    return {
      id: null,
      workId: cleanId,
      title: workData.title || 'Không có tiêu đề',
      author: null,
      description,
      publishYear,
      totalPages: null,
      subjects: Array.isArray(workData.subjects) ? workData.subjects.slice(0, 10) : [],
      coverUrl,
      inLibrary: false
    };
  }
};
