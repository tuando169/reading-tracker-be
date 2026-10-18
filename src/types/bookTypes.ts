export interface BookSearchResultItem {
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
}

