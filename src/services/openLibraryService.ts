import axios, { AxiosInstance } from 'axios';
import {
  OpenLibrarySearchResponse,
  OpenLibraryWorkResponse
} from '../types/openLibraryTypes.js';
import { logger } from '../utils/logger.js';
import { helpers } from '../utils/helpers.js';

const client: AxiosInstance = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 8000,
  headers: {
    'User-Agent': 'MiniReadingTracker/1.0 (contact: student-project@readingtracker.local)'
  }
});

export const openLibraryService = {
  buildCoverUrl(coverId?: number): string | null {
    if (!coverId || coverId <= 0) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  },

  async searchBooks(keyword: string, page: number = 1, limit: number = 20): Promise<OpenLibrarySearchResponse> {
    if (!keyword || keyword.trim().length < 3) {
      return { numFound: 0, start: 0, docs: [] };
    }

    try {
      const response = await client.get<OpenLibrarySearchResponse>('/search.json', {
        params: {
          q: keyword,
          page,
          limit,
          fields: 'key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject'
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 422) {
        // Open Library yêu cầu tối thiểu 3 ký tự
        return { numFound: 0, start: 0, docs: [] };
      }
      logger.error(`OpenLibrary searchBooks failed for "${keyword}": ${error.message}`);
      return { numFound: 0, start: 0, docs: [] };
    }
  },
  async getWorkDetail(id: string): Promise<OpenLibraryWorkResponse | null> {
    const cleanId = helpers.extractWorkId(id);
    try {
      const response = await client.get<OpenLibraryWorkResponse>(`/works/${cleanId}.json`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`OpenLibrary getWorkDetail failed for "${id}": ${error.message}`);
      return null;
    }
  }
};
