export interface BookSearchResultItem {
  id: number | null;
  workId: string;
  title: string;
  author: string | null;
  publishYear: number | null;
  coverUrl: string | null;
  inLibrary: boolean;
}

export interface BookDetail {
  id: number | null;
  workId: string;
  title: string;
  author: string | null;
  description: string | null;
  publishYear: number | null;
  totalPages: number | null;
  subjects: string[];
  coverUrl: string | null;
  inLibrary: boolean;
  status?: number;
  currentPage?: number;
  rating?: number;
  note?: string;
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  docs: OpenLibraryDoc[];
}

export interface OpenLibraryWorkResponse {
  key: string;
  title: string;
  description?: string | { type?: string; value: string };
  covers?: number[];
  subjects?: string[];
  first_publish_date?: string;
}
