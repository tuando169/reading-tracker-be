import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database.js';
import {
  LibraryBookRecord,
  CreateLibraryBookDTO,
  UpdateLibraryBookDTO
} from '../types/libraryTypes.js';

export const libraryRepository = {
  /**
   * Tìm bản ghi theo ID (chính là OpenLibrary workId, ví dụ: OL82563W)
   */
  async findById(id: string): Promise<LibraryBookRecord | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM books WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) return null;
    return rows[0] as LibraryBookRecord;
  },

  /**
   * Tìm nhiều bản ghi theo danh sách IDs
   */
  async findByIds(ids: string[]): Promise<LibraryBookRecord[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM books WHERE id IN (${placeholders})`,
      ids
    );
    return rows as LibraryBookRecord[];
  },

  /**
   * Thêm sách mới vào tủ
   */
  async create(data: CreateLibraryBookDTO): Promise<string> {
    const startedAt = data.status === 1 ? new Date() : null;
    const subjectsJson = JSON.stringify(data.subjects || []);

    await pool.execute<ResultSetHeader>(
      `INSERT INTO books (
        id, title, author, cover_url, description, 
        publish_year, total_pages, subjects, status, current_page, 
        rating, note, started_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '', ?, NULL)`,
      [
        data.id,
        data.title,
        data.author,
        data.coverUrl,
        data.description,
        data.publishYear,
        data.totalPages,
        subjectsJson,
        data.status,
        startedAt
      ]
    );

    return data.id;
  },

  /**
   * Lấy danh sách sách có phân trang và lọc theo status
   */
  async findMany(
    status?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: LibraryBookRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    let countSql = 'SELECT COUNT(*) as total FROM books';
    let selectSql = 'SELECT * FROM books';
    const params: any[] = [];

    if (status !== undefined) {
      countSql += ' WHERE status = ?';
      selectSql += ' WHERE status = ?';
      params.push(status);
    }

    selectSql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';

    const [countRows] = await pool.execute<RowDataPacket[]>(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    const [items] = await pool.query<RowDataPacket[]>(
      selectSql,
      [...params, limit, offset]
    );

    return {
      items: items as LibraryBookRecord[],
      total
    };
  },

  /**
   * Cập nhật bản ghi trong tủ sách
   */
  async update(
    id: string,
    data: {
      status?: number;
      currentPage?: number;
      rating?: number;
      note?: string;
      startedAt?: Date | null;
      finishedAt?: Date | null;
    }
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.currentPage !== undefined) {
      fields.push('current_page = ?');
      values.push(data.currentPage);
    }
    if (data.rating !== undefined) {
      fields.push('rating = ?');
      values.push(data.rating);
    }
    if (data.note !== undefined) {
      fields.push('note = ?');
      values.push(data.note);
    }
    if (data.startedAt !== undefined) {
      fields.push('started_at = ?');
      values.push(data.startedAt);
    }
    if (data.finishedAt !== undefined) {
      fields.push('finished_at = ?');
      values.push(data.finishedAt);
    }

    if (!fields.length) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE books SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  },

  /**
   * Xóa bản ghi theo ID
   */
  async delete(id: string): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM books WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
};
