import { ReadingStatusType } from '../config/constants.js';

export interface LibraryBookRecord {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  publish_year: number | null;
  total_pages: number | null;
  subjects: string | string[] | null;
  status: ReadingStatusType;
  current_page: number;
  rating: number;
  note: string;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface LibraryBookResponse {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  description?: string | null;
  publishYear?: number | null;
  status: ReadingStatusType;
  currentPage: number;
  totalPages: number | null;
  progressPercent: number;
  rating: number;
  note: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryBookDTO {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  description: string | null;
  publishYear: number | null;
  totalPages: number | null;
  subjects: string[];
  status: ReadingStatusType;
}

export interface UpdateLibraryBookDTO {
  id: string;
  currentPage?: number;
  rating?: number;
  note?: string;
}
