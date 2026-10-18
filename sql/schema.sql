CREATE DATABASE IF NOT EXISTS defaultdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE defaultdb;

CREATE TABLE IF NOT EXISTS books (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  work_id VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(500) NULL,
  cover_url TEXT NULL,
  description TEXT NULL,
  publish_year INT NULL,
  total_pages INT UNSIGNED NULL,
  subjects JSON NULL,
  status TINYINT UNSIGNED NOT NULL DEFAULT 0,
  current_page INT UNSIGNED NOT NULL DEFAULT 0,
  rating TINYINT UNSIGNED NOT NULL DEFAULT 0,
  note VARCHAR(2000) NOT NULL DEFAULT '',
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Ràng buộc toàn vẹn dữ liệu
  CONSTRAINT chk_status CHECK (status IN (0, 1, 2)),
  CONSTRAINT chk_rating CHECK (rating BETWEEN 0 AND 5),
  CONSTRAINT chk_progress CHECK (total_pages IS NULL OR current_page <= total_pages)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chỉ mục tối ưu hóa truy vấn lọc trạng thái và sắp xếp thời gian
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_updated_at ON books(updated_at DESC);
