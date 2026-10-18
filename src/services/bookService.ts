import { openLibraryService } from './openLibraryService.js';
import { helpers } from '../utils/helpers.js';
import { libraryRepository } from '../repositories/libraryRepository.js';
import { BookSearchResultItem } from '../types/bookTypes.js';
import { PaginationMeta } from '../types/apiTypes.js';

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

    const items: BookSearchResultItem[] = rawResult.docs.map((doc) => {
      const workId = helpers.extractWorkId(doc.key);
      const author = Array.isArray(doc.author_name) && doc.author_name.length > 0
        ? doc.author_name.join(', ')
        : null;
      const coverUrl = openLibraryService.buildCoverUrl(doc.cover_i);

      const subjects = Array.isArray(doc.subject) ? doc.subject.slice(0, 10) : [];

      return {
        id: null,
        workId,
        title: doc.title || 'Không có tiêu đề',
        author,
        description: null,
        publishYear: doc.first_publish_year || null,
        totalPages: doc.number_of_pages_median || null,
        subjects,
        coverUrl,
        inLibrary: false
      };
    });

    const workIds = items.map((item) => item.workId).filter(Boolean);
    const existingBooks = await libraryRepository.findByWorkIds(workIds);

    const existingMap = new Map<string, (typeof existingBooks)[0]>();
    for (const b of existingBooks) {
      existingMap.set(b.work_id, b);
    }

    for (const item of items) {
      const existing = existingMap.get(item.workId);
      if (existing) {
        item.inLibrary = true;
        item.id = existing.id;
        item.title = existing.title || item.title;
        item.author = existing.author || item.author;
        item.description = existing.description || item.description;
        item.publishYear = existing.publish_year || item.publishYear;
        item.totalPages = existing.total_pages || item.totalPages;
        item.coverUrl = existing.cover_url || item.coverUrl;

        const dbSubjects = helpers.parseSubjects(existing.subjects);
        if (dbSubjects.length > 0) {
          item.subjects = dbSubjects;
        }
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
  }
};

