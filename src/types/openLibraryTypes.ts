export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
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
