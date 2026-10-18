import axios, { AxiosInstance } from 'axios';
import {
  OpenLibrarySearchResponse,
  OpenLibraryWorkResponse
} from '../types/bookTypes.js';
import { logger } from '../utils/logger.js';
import { Helpers } from '../utils/helpers.js';

const client: AxiosInstance = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 8000,
});

export const openLibraryService = {
  buildCoverUrl(coverId?: number): string | null {
    if (!coverId || coverId <= 0) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  },

  async searchBooks(keyword: string, page: number = 1, limit: number = 20): Promise<OpenLibrarySearchResponse> {
    try {
      const response = await client.get<OpenLibrarySearchResponse>('/search.json', {
        params: {
          q: keyword,
          page,
          limit
        }
      });
      return response.data;
    } catch (error: any) {
      logger.error(`OpenLibrary searchBooks failed for "${keyword}": ${error.message}`);
      return { numFound: 0, start: 0, docs: [] };
    }
  },
  async getWorkDetail(workId: string): Promise<OpenLibraryWorkResponse | null> {
    const cleanId = Helpers.extractWorkId(workId);
    try {
      const response = await client.get<OpenLibraryWorkResponse>(`/works/${cleanId}.json`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error(`OpenLibrary getWorkDetail failed for "${workId}": ${error.message}`);
      return null;
    }
  }
};
