import { openLibraryService } from "./openLibraryService.js";
import { helpers } from "../utils/helpers.js";
import { libraryRepository } from "../repositories/libraryRepository.js";
import { BookSearchResultItem } from "../types/bookTypes.js";
import { PaginationMeta } from "../types/apiTypes.js";
import { logger } from "../utils/logger.js";

export const bookService = {
  async searchBooks(
    keyword: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: BookSearchResultItem[]; meta: PaginationMeta }> {
    const rawResult = await openLibraryService.searchBooks(
      keyword,
      page,
      limit,
    );

    const items: BookSearchResultItem[] = rawResult.docs.map((doc) => {
      const id = helpers.extractWorkId(doc.key);
      const author =
        Array.isArray(doc.author_name) && doc.author_name.length > 0
          ? doc.author_name.join(", ")
          : null;
      const coverUrl = openLibraryService.buildCoverUrl(doc.cover_i);

      const subjects = Array.isArray(doc.subject)
        ? doc.subject.slice(0, 10)
        : [];
      logger.info(doc.subject);
      return {
        id,
        title: doc.title,
        author,
        description: null,
        publishYear: doc.first_publish_year || null,
        totalPages: doc.number_of_pages_median || null,
        subjects,
        coverUrl,
        inLibrary: false,
      };
    });

    const ids = items.map((item) => item.id).filter(Boolean);
    const existingBooks = await libraryRepository.findByIds(ids);

    const existingMap = new Map<string, (typeof existingBooks)[0]>();
    for (const b of existingBooks) {
      existingMap.set(b.id, b);
    }

    for (const item of items) {
      const existing = existingMap.get(item.id);
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
        totalPages,
      },
    };
  },
};
