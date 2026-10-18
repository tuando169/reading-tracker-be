# TÀI LIỆU TRIỂN KHAI BACKEND
## Mini Reading Tracker (Node.js + Express + TypeScript + MySQL)

> **Căn cứ tài liệu:** Trích xuất và đặc tả chi tiết từ [`doc.md`](file:///d:/Workspace/reading-tracker/reading-tracker-be/doc.md) (Tài liệu Backend & Hợp đồng API đề xuất).  
> **Mục tiêu tài liệu:** Cung cấp bản thiết kế kỹ thuật, kiến trúc thư mục, mô hình dữ liệu (Database Schema), luồng tích hợp Open Library, chi tiết tầng Controller/Service/Repository, bảo mật & validation, kế hoạch deploy HTTPS và checklist nghiệm thu cho Backend.

---

## MỤC LỤC
1. [Tổng quan dự án & Ràng buộc kỹ thuật](#1-tổng-quan-dự-án--ràng-buộc-kỹ-thuật)
2. [Lựa chọn Tech Stack & Thư viện](#2-lựa-chọn-tech-stack--thư-viện)
3. [Cấu trúc Thư mục Dự án (Clean Architecture / 3-Tier Layered)](#3-cấu-trúc-thư-mục-dự-án)
4. [Thiết kế Cơ sở dữ liệu (MySQL Schema & Indexes)](#4-thiết-kế-cơ-sở-dữ-liệu-mysql)
5. [Tích hợp Open Library (Data Ingestion & Normalization)](#5-tích-hợp-open-library)
6. [Đặc tả Chi tiết RESTful API & Chuẩn hóa Response / Error](#6-đặc-tả-chi-tiết-restful-api)
7. [Hiện thực Hóa Nghiệp vụ Cốt lõi (Business Logic & Validation)](#7-hiện-thực-hóa-nghiệp-vụ-cốt-lõi)
8. [Cấu hình Môi trường, Log & Xử lý Ngoại lệ Toàn cục](#8-cấu-hình-môi-trường-log--ngoại-lệ-toàn-cục)
9. [Lộ trình Triển khai Chi tiết (Phân kỳ thực hiện)](#9-lộ-trình-triển-khai-chi-tiết)
10. [Hướng dẫn Triển khai Production & Public HTTPS](#10-hướng-dẫn-triển-khai-production--public-https)
11. [Checklist Kiểm thử & Nghiệm thu (Verification & QA)](#11-checklist-kiểm-thử--nghiệm-thu)

---

## 1. TỔNG QUAN DỰ ÁN & RÀNG BUỘC KỸ THUẬT

### 1.1. Mục tiêu
Xây dựng hệ thống Backend RESTful API đóng vai trò **trung gian duy nhất** giữa Frontend (Vue.js 3) và kho dữ liệu cộng đồng Open Library, đồng thời quản lý dữ liệu lưu trữ bền vững (Tủ sách cá nhân) trên cơ sở dữ liệu **MySQL**.

### 1.2. Ràng buộc bắt buộc (Non-negotiable constraints)
- **Nền tảng Backend:** Node.js (khuyến nghị TypeScript + Express.js).
- **Cơ sở dữ liệu:** MySQL (phiên bản 8.0+).
- **Nguồn dữ liệu sách:** Open Library API (Public REST API, miễn phí, không yêu cầu API key).
- **Phạm vi người dùng:** Single-user (không yêu cầu phân quyền, token hoặc đăng nhập).
- **Nguyên tắc Gateway:** Frontend **tuyệt đối không gọi trực tiếp** tới Open Library. Mọi request tìm kiếm sách, metadata chi tiết đều qua Backend điều phối và chuẩn hóa.
- **Tính toàn vẹn dữ liệu tủ sách:** Dữ liệu tủ sách bắt buộc phải lưu trữ bền vững trong MySQL, chống trùng lặp dữ liệu trên cùng một tác phẩm (`workId`).
- **Thời gian hoàn thành:** 3 – 5 ngày.
- **Môi trường triển khai:** Backend, Database và Frontend phải được public công khai với giao thức **HTTPS bắt buộc**.

---

## 2. LỰA CHỌN TECH STACK & THƯ VIỆN

| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò & Lý do lựa chọn |
| :--- | :--- | :--- | :--- |
| **Runtime** | **Node.js** | `>= 20.x LTS` | Đảm bảo hiệu năng I/O bất đồng bộ, ổn định và hiện đại |
| **Ngôn ngữ** | **TypeScript** | `^5.x` | Typings chặt chẽ, an toàn kiểu dữ liệu, tránh bug runtime |
| **Web Framework** | **Express.js** | `^4.19` (hoặc `^5.x`) | Minimalist, linh hoạt, hệ sinh thái middleware phong phú |
| **Database Driver** | **mysql2** (Promise pool) | `^3.9` | Driver MySQL nhanh nhất cho Node.js, hỗ trợ Prepared Statements chống SQL Injection, connection pooling |
| **HTTP Client** | **Axios** | `^1.7` | Giao tiếp với Open Library API kèm cấu hình timeout và retry |
| **Validation** | **Zod** | `^3.23` | Validate request params, query và body theo schema chuẩn xác |
| **API Documentation** | **Swagger UI Express** + **swagger-jsdoc** | `^5.0`, `^6.2` | Tự động sinh tài liệu Open API / Swagger UI trực quan tại `/api-docs` |
| **Security & Headers**| **Helmet**, **CORS** | `^7.x`, `^2.8` | Thiết lập Security HTTP headers, cho phép FE gọi cross-origin |
| **Logging** | **Morgan** + **Winston** | `^1.10`, `^3.13` | Ghi vết HTTP requests và structured log có timestamps |
| **Environment** | **dotenv** | `^16.4` | Nạp biến môi trường từ file `.env` |

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

Áp dụng mô hình **3-Tier Layered Architecture** (Controller - Service - Repository/DAO) giúp phân tách rõ ràng trách nhiệm giữa routing, logic nghiệp vụ, và tầng tương tác cơ sở dữ liệu/API bên ngoài.

```
reading-tracker-be/
├── .env.example                # Mẫu biến môi trường
├── .env                        # Biến môi trường cục bộ (không commit)
├── .gitignore
├── package.json
├── tsconfig.json
├── doc.md                      # Tài liệu yêu cầu & hợp đồng API
├── implement.md                # Tài liệu triển khai Backend (file này)
├── sql/
│   ├── schema.sql              # DDL tạo bảng, chỉ mục và ràng buộc
│   └── seed.sql                # Dữ liệu mẫu kiểm thử
└── src/
    ├── app.ts                  # Cấu hình Express app, middlewares chung
    ├── server.ts               # Khởi tạo HTTP server & lắng nghe port
    ├── config/
    │   ├── database.ts         # Khởi tạo kết nối MySQL Pool (mysql2/promise)
    │   ├── env.ts              # Load và validate biến môi trường qua Zod
    │   └── constants.ts        # Hằng số enum (ReadingStatus), default pagination
    ├── types/
    │   ├── bookTypes.ts        # Type cho Sách, Open Library Response
    │   ├── libraryTypes.ts     # Type cho Bản ghi Tủ sách MySQL
    │   └── apiTypes.ts         # Type cho ApiResponse, ApiErrorResponse, Meta
    ├── middlewares/
    │   ├── errorHandler.ts     # Middleware bắt và format lỗi tập trung
    │   ├── requestValidator.ts # Middleware validate qua Zod schemas
    │   └── notFoundHandler.ts  # Middleware xử lý route không tồn tại (404)
    ├── routes/
    │   ├── index.ts            # Route index gắn prefix /api/v1
    │   ├── bookRoutes.ts       # Routes cho /api/v1/books
    │   └── libraryRoutes.ts    # Routes cho /api/v1/library
    ├── controllers/
    │   ├── bookController.ts     # Nhận request, gọi service, trả response
    │   └── libraryController.ts  # Điều phối thêm/sửa/xóa/đọc tủ sách
    ├── services/
    │   ├── openLibraryService.ts # Adapter gọi API Open Library và parse dữ liệu
    │   ├── bookService.ts        # Logic tìm kiếm, làm giàu trạng thái inLibrary
    │   └── libraryService.ts     # Logic tính tiến độ, chuyển status, validate logic
    ├── repositories/
    │   └── libraryRepository.ts  # Tương tác MySQL: INSERT, UPDATE, SELECT, DELETE
    ├── validations/
    │   ├── bookValidation.ts     # Zod schema validate search, params book
    │   └── libraryValidation.ts  # Zod schema validate body & params library
    └── utils/
        ├── logger.ts             # Logger Winston chuẩn hóa
        ├── appError.ts           # Class lỗi nghiệp vụ tùy biến
        └── helpers.ts            # Hàm build ApiResponse và helper chuẩn hóa Open Library
```

---

## 4. THIẾT KẾ CƠ SỞ DỮ LIỆU (MYSQL)

### 4.1. Bảng `books` (Lưu trữ sách trong tủ và tiến độ đọc)

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT PRIMARY KEY` | Khóa chính nội bộ MySQL, dùng trong các endpoint `/library/:id` |
| `work_id` | `VARCHAR(100)` | `NOT NULL UNIQUE` | Định danh Work ID từ Open Library (VD: `OL82563W`), chống thêm trùng |
| `title` | `VARCHAR(500)` | `NOT NULL` | Tên tác phẩm |
| `author` | `VARCHAR(500)` | `NULL` | Tên tác giả (nối chuỗi nếu có nhiều tác giả) |
| `cover_url` | `TEXT` | `NULL` | URL ảnh bìa sách |
| `description` | `TEXT` | `NULL` | Tóm tắt mô tả nội dung tác phẩm |
| `publish_year` | `INT` | `NULL` | Năm xuất bản đầu tiên |
| `total_pages` | `INT UNSIGNED` | `NULL` | Tổng số trang sách (nếu có từ Open Library) |
| `subjects` | `JSON` | `NULL` | Mảng danh sách thể loại / chủ đề (Tags) |
| `status` | `TINYINT UNSIGNED` | `NOT NULL DEFAULT 0` | Trạng thái: `0` (Chưa/Muốn đọc), `1` (Đang đọc), `2` (Đã đọc) |
| `current_page` | `INT UNSIGNED` | `NOT NULL DEFAULT 0` | Số trang người dùng đã đọc hiện tại |
| `rating` | `TINYINT UNSIGNED` | `NOT NULL DEFAULT 0` | Điểm đánh giá: `0` (chưa đánh giá), `1`–`5` (sao) |
| `note` | `VARCHAR(2000)` | `NOT NULL DEFAULT ''` | Ghi chú cá nhân, mặc định rỗng, không chấp nhận null |
| `started_at` | `DATETIME` | `NULL` | Thời điểm bắt đầu đọc lần đầu tiên (`status = 1`) |
| `finished_at` | `DATETIME` | `NULL` | Thời điểm hoàn thành sách (`status = 2`) |
| `created_at` | `DATETIME` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Thời điểm thêm sách vào tủ |
| `updated_at` | `DATETIME` | `NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Thời điểm cập nhật cuối cùng |

### 4.2. DDL Script Tạo Bảng & Indexes (`sql/schema.sql`)

```sql
-- Tạo Database nếu chưa có
CREATE DATABASE IF NOT EXISTS defaultdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE defaultdb;

-- Bảng lưu trữ Tủ sách
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

-- Chỉ mục hỗ trợ tối ưu lọc trạng thái và sắp xếp
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_updated_at ON books(updated_at DESC);
```

---

## 5. TÍCH HỢP OPEN LIBRARY (GATEWAY SERVICE)

Backend đóng vai trò Adapter và Proxy trung gian. Frontend không bao giờ tương tác trực tiếp với domain `openlibrary.org`.

### 5.1. Các Endpoint Open Library sử dụng

1. **Tìm kiếm sách:**
   - **URL:** `GET https://openlibrary.org/search.json?q={keyword}&page={page}&limit={limit}`
   - **Trích xuất:** `docs[]` -> `key` (dạng `/works/OL82563W`), `title`, `author_name`, `first_publish_year`, `cover_i`, `number_of_pages_median`.
2. **Chi tiết tác phẩm:**
   - **URL:** `GET https://openlibrary.org/works/{workId}.json`
   - **Trích xuất:** `title`, `description` (có thể là string hoặc object `{ type: string, value: string }`), `covers`, `subjects`.
3. **Ảnh bìa sách (Covers):**
   - **URL chuẩn:** `https://covers.openlibrary.org/b/id/{coverId}-M.jpg`
   - Fallback `null` nếu không có `cover_i` hoặc `covers`.

### 5.2. Chuẩn hóa ID Tác phẩm (`workId`)
Open Library trả `key` có dạng `/works/OL82563W`. Backend chuẩn hóa bằng hàm:
```typescript
export function extractWorkId(rawKey: string): string {
  return rawKey.replace('/works/', '').trim();
}
```

### 5.3. Xử lý thiếu dữ liệu & Fallback an toàn
- `description`: Có thể là chuỗi string hoặc object `{ value: "..." }`. Nếu không có, gán `null`.
- `total_pages`: Open Library Search API đôi khi trả `number_of_pages_median`. Nếu không có, lưu `null`.
- `coverUrl`: Trả link ảnh bìa Open Library kích thước `-M.jpg` (Medium) hoặc `null`.

---

## 6. ĐẶC TẢ CHI TIẾT RESTFUL API

**Base Path:** `/api/v1`

### 6.1. Quy chuẩn Response & Error Format Thống nhất

#### Response Thành công (`ApiResponse<T>`):
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```
*(Trường `meta` chỉ xuất hiện ở các API có phân trang).*

#### Response Lỗi (`ApiErrorResponse`):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu gửi lên không hợp lệ",
    "details": {
      "currentPage": "Số trang hiện tại không được vượt quá tổng số trang"
    }
  }
}
```

---

### 6.2. Bảng Danh mục API

| STT | Method | Endpoint | Mô tả | Request Params / Body | Status Success |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/books` | Tìm kiếm sách qua Open Library | Query: `keyword`, `page`, `limit` | `200 OK` |
| 2 | `GET` | `/books/:workId` | Chi tiết sách qua Work ID | Path: `workId` | `200 OK` |
| 3 | `GET` | `/library` | Danh sách sách trong tủ cá nhân | Query: `status?`, `page`, `limit` | `200 OK` |
| 4 | `POST` | `/library` | Thêm sách vào tủ cá nhân | Body: `{ workId, status }` | `201 Created` |
| 5 | `PATCH`| `/library/:id` | Cập nhật tiến độ, trạng thái, đánh giá | Path: `id`, Body: partial update | `200 OK` |
| 6 | `DELETE`| `/library/:id`| Xóa sách khỏi tủ cá nhân | Path: `id` | `200 OK` |

---

### 6.3. Chi tiết Từng Endpoint

#### 1. `GET /api/v1/books` (Tìm kiếm sách)
- **Query Params:**
  - `keyword` (bắt buộc, chuỗi không rỗng)
  - `page` (tùy chọn, mặc định `1`, `>= 1`)
  - `limit` (tùy chọn, mặc định `20`, `1 <= limit <= 50`)
- **Nghiệp vụ Backend:**
  - Gọi Open Library Search API.
  - Lấy danh sách `work_id` từ kết quả.
  - Query MySQL: `SELECT id, work_id FROM books WHERE work_id IN (...)`.
  - Gắn cờ: Nếu sách đã có trong MySQL -> `inLibrary = true`, `id = mysql_id`. Nếu chưa -> `inLibrary = false`, `id = null`.
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 1,
      "workId": "OL82563W",
      "title": "Harry Potter and the Philosopher's Stone",
      "author": "J. K. Rowling",
      "publishYear": 1997,
      "coverUrl": "https://covers.openlibrary.org/b/id/10521270-M.jpg",
      "inLibrary": true
    },
    {
      "id": null,
      "workId": "OL27448W",
      "title": "The Lord of the Rings",
      "author": "J. R. R. Tolkien",
      "publishYear": 1954,
      "coverUrl": null,
      "inLibrary": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1420,
    "totalPages": 71
  }
}
```

---

#### 2. `GET /api/v1/books/:workId` (Chi tiết tác phẩm)
- **Path Params:** `workId` (ví dụ `OL82563W`)
- **Nghiệp vụ Backend:**
  - Kiểm tra xem sách đã lưu trong bảng `books` chưa (`SELECT * FROM books WHERE work_id = ?`).
  - Nếu đã lưu: trả dữ liệu từ MySQL kèm trạng thái tủ sách.
  - Nếu chưa: gọi `https://openlibrary.org/works/{workId}.json`, trích xuất description, subjects, covers, trả về với `id: null`, `inLibrary: false`.
- **Response `200 OK`:**
```json
{
  "data": {
    "id": null,
    "workId": "OL82563W",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J. K. Rowling",
    "description": "Harry Potter has never even heard of Hogwarts when the letters start dropping on the doormat...",
    "publishYear": 1997,
    "totalPages": 223,
    "subjects": ["Fantasy", "Wizards", "Magic"],
    "coverUrl": "https://covers.openlibrary.org/b/id/10521270-M.jpg",
    "inLibrary": false
  }
}
```

---

#### 3. `POST /api/v1/library` (Thêm sách vào tủ)
- **Body Request:**
```json
{
  "workId": "OL82563W",
  "status": 0
}
```
- **Validation Rules:**
  - `workId`: string, không rỗng, đúng định dạng Open Library work key.
  - `status`: integer, thuộc `{0, 1, 2}`, mặc định là `0` nếu không truyền.
- **Nghiệp vụ Backend:**
  1. Kiểm tra tồn tại trong DB: `SELECT id FROM books WHERE work_id = ?`.
  2. Nếu **đã tồn tại**: ném lỗi `409 Conflict` (`BOOK_ALREADY_EXISTS`).
  3. Nếu **chưa**: Gọi Open Library lấy metadata đầy đủ (tiêu đề, tác giả, mô tả, ảnh bìa, số trang, năm XB).
  4. Xác định ngày bắt đầu: Nếu `status == 1` -> gán `started_at = NOW()`.
  5. INSERT vào bảng `books`.
  6. Trả về bản ghi vừa tạo với HTTP status `201 Created`.
- **Response `201 Created`:**
```json
{
  "data": {
    "id": 1,
    "workId": "OL82563W",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J. K. Rowling",
    "coverUrl": "https://covers.openlibrary.org/b/id/10521270-M.jpg",
    "status": 0,
    "currentPage": 0,
    "totalPages": 223,
    "progressPercent": 0,
    "rating": 0,
    "note": "",
    "startedAt": null,
    "finishedAt": null,
    "createdAt": "2026-10-18T04:00:00.000Z",
    "updatedAt": "2026-10-18T04:00:00.000Z"
  }
}
```

---

#### 4. `GET /api/v1/library` (Lấy danh sách tủ sách)
- **Query Params:**
  - `status` (tùy chọn: `0`, `1`, hoặc `2`). Nếu không truyền -> lấy tất cả.
  - `page` (mặc định `1`, `>= 1`)
  - `limit` (mặc định `20`, `1 <= limit <= 50`)
- **Nghiệp vụ Backend:**
  - Query `COUNT(*)` từ `books` theo điều kiện `status`.
  - Query danh sách với `LIMIT` và `OFFSET`, sắp xếp theo `updated_at DESC`.
  - Tính toán động trường `progressPercent`:
    - Nếu `totalPages > 0`: `Math.round((currentPage / totalPages) * 10000) / 100` (lấy 2 chữ số thập phân).
    - Nếu `totalPages` rỗng hoặc bằng 0: `0`.
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 1,
      "workId": "OL82563W",
      "title": "Harry Potter and the Philosopher's Stone",
      "author": "J. K. Rowling",
      "coverUrl": "https://covers.openlibrary.org/b/id/10521270-M.jpg",
      "status": 1,
      "currentPage": 100,
      "totalPages": 223,
      "progressPercent": 44.84,
      "rating": 4,
      "note": "Sách rất lôi cuốn",
      "startedAt": "2026-10-18T03:00:00.000Z",
      "finishedAt": null,
      "updatedAt": "2026-10-18T04:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### 5. `PATCH /api/v1/library/:id` (Cập nhật tiến độ, đánh giá, ghi chú)
- **Path Params:** `id` (số nguyên `INT UNSIGNED`)
- **Body Request (Tất cả các trường đều optional):**
```json
{
  "status": 1,
  "currentPage": 120,
  "rating": 5,
  "note": "Vừa đọc thêm chương mới, tuyệt vời!"
}
```
- **Validation Rules & Ràng buộc:**
  - `status`: số nguyên `0`, `1`, hoặc `2`.
  - `currentPage`: số nguyên `>= 0`. Nếu sách có `totalPages`, bắt buộc `currentPage <= totalPages`.
  - `rating`: số nguyên từ `0` đến `5` (0 = chưa chấm sao, không nhận `null`).
  - `note`: chuỗi ký tự, tối đa 2000 ký tự (không nhận `null`, xóa note gửi `""`).
- **Nghiệp vụ Xử lý Chuyển trạng thái & Mốc thời gian:**
  1. Lấy bản ghi hiện tại từ DB theo `id`. Nếu không thấy -> trả `404 Not Found`.
  2. **Tự động hoàn thành:** Nếu cập nhật `currentPage == totalPages` (với `totalPages > 0`), tự động set `status = 2`.
  3. **Ghi mốc `started_at`:** Nếu trạng thái chuyển sang `1` (Đang đọc) và trước đó `started_at` đang là `NULL` -> gán `started_at = NOW()`.
  4. **Ghi mốc `finished_at`:**
     - Nếu trạng thái chuyển sang `2` (Đã đọc) -> gán `finished_at = NOW()`.
     - Nếu trạng thái chuyển từ `2` lùi về `1` hoặc `0` -> reset `finished_at = NULL`.
  5. Cập nhật vào DB và tính lại `progressPercent` trả về.
- **Response `200 OK`:**
```json
{
  "data": {
    "id": 1,
    "workId": "OL82563W",
    "status": 1,
    "currentPage": 120,
    "totalPages": 223,
    "progressPercent": 53.81,
    "rating": 5,
    "note": "Vừa đọc thêm chương mới, tuyệt vời!",
    "startedAt": "2026-10-18T03:00:00.000Z",
    "finishedAt": null,
    "updatedAt": "2026-10-18T04:30:00.000Z"
  }
}
```

---

#### 6. `DELETE /api/v1/library/:id` (Xóa sách khỏi tủ)
- **Path Params:** `id` (số nguyên `INT UNSIGNED`)
- **Nghiệp vụ Backend:**
  - Kiểm tra tồn tại trong DB. Nếu không có -> trả `404 Not Found`.
  - Thực thi: `DELETE FROM books WHERE id = ?`.
  - Trả về kết quả xác nhận.
- **Response `200 OK`:**
```json
{
  "data": {
    "id": 1,
    "deleted": true
  }
}
```

---

## 7. HIỆN THỰC HÓA NGHIỆP VỤ CỐT LÕI

### 7.1. Định nghĩa Enum Trạng thái
```typescript
// src/config/constants.ts
export const ReadingStatus = {
  WANT_TO_READ: 0,
  READING: 1,
  COMPLETED: 2
} as const;

export type ReadingStatusType = typeof ReadingStatus[keyof typeof ReadingStatus];
```

### 7.2. Schema Validation với Zod
```typescript
// src/validations/libraryValidation.ts
import { z } from 'zod';

export const AddBookToLibrarySchema = z.object({
  body: z.object({
    workId: z.string().min(1, 'workId không được để trống'),
    status: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0)
  })
});

export const UpdateBookProgressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương')
  }),
  body: z.object({
    status: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    currentPage: z.number().int().min(0, 'Trang hiện tại phải >= 0').optional(),
    rating: z.number().int().min(0).max(5, 'Điểm đánh giá phải từ 0 đến 5').optional(),
    note: z.string().max(2000, 'Ghi chú tối đa 2000 ký tự').optional()
  })
});
```

### 7.3. Service Logic: Tính toán Tiến độ & Quản lý Timestamp
```typescript
// src/services/libraryService.ts trích đoạn xử lý update
export function calculateProgress(current: number, total: number | null): number {
  if (!total || total <= 0) return 0;
  if (current >= total) return 100;
  return Math.round((current / total) * 10000) / 100;
}

export function resolveTimestampsAndStatus(
  currentRecord: LibraryBookRecord,
  payload: UpdatePayload
) {
  let nextStatus = payload.status ?? currentRecord.status;
  const nextCurrentPage = payload.currentPage ?? currentRecord.current_page;
  const totalPages = currentRecord.total_pages;

  // Tự động chuyển COMPLETED nếu đọc hết trang
  if (totalPages && totalPages > 0 && nextCurrentPage >= totalPages) {
    nextStatus = ReadingStatus.COMPLETED;
  }

  let startedAt = currentRecord.started_at;
  let finishedAt = currentRecord.finished_at;

  // Lần đầu sang ĐANG ĐỌC
  if (nextStatus === ReadingStatus.READING && !startedAt) {
    startedAt = new Date();
  }

  // Chuyển sang ĐÃ ĐỌC
  if (nextStatus === ReadingStatus.COMPLETED) {
    if (!finishedAt) finishedAt = new Date();
  } else if (payload.status !== undefined && payload.status < ReadingStatus.COMPLETED) {
    // Chuyển ngược về chưa đọc/đang đọc
    finishedAt = null;
  }

  return { nextStatus, nextCurrentPage, startedAt, finishedAt };
}
```

---

## 8. CẤU HÌNH MÔI TRƯỜNG, LOG & NGOẠI LỆ TOÀN CỤC

### 8.1. File Biến Môi trường Mẫu (`.env.example`)
```env
# Server
PORT=3000
NODE_ENV=production

# Database MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=defaultdb
DB_CONNECTION_LIMIT=10

# CORS
CORS_ORIGIN=https://reading-tracker.yourdomain.com

# Upstream Open Library
OPEN_LIBRARY_API_BASE=https://openlibrary.org
OPEN_LIBRARY_TIMEOUT_MS=8000
```

### 8.2. Middleware Xử lý Lỗi Toàn cục (`src/middlewares/errorHandler.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

  // 1. Lỗi Validation Zod
  if (err instanceof ZodError) {
    const details = err.errors.reduce((acc: any, cur) => {
      const field = cur.path.slice(1).join('.');
      acc[field] = cur.message;
      return acc;
    }, {});
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details
      }
    });
  }

  // 2. Lỗi nghiệp vụ tùy biến (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // 3. Lỗi trùng lặp MySQL ER_DUP_ENTRY
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: {
        code: 'BOOK_ALREADY_EXISTS',
        message: 'Sách đã tồn tại trong tủ sách cá nhân'
      }
    });
  }

  // 4. Lỗi mặc định Server 500
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
    }
  });
}
```

---

## 9. LỘ TRÌNH TRIỂN KHAI CHI TIẾT

Thời gian cam kết: **3 – 5 ngày**. Phân kỳ thực hiện:

### Ngày 1: Setup Dự án, MySQL Schema & Kết nối
- Khởi tạo repo `reading-tracker-be` bằng `npm init` và cấu hình TypeScript (`tsconfig.json`).
- Cài đặt các dependencies: `express`, `mysql2`, `dotenv`, `cors`, `helmet`, `zod`, `axios`, `morgan`.
- Thiết lập cấu trúc thư mục 3 tầng với quy chuẩn đặt tên file **camelCase**.
- Tạo script DDL `schema.sql`, chạy migration trên MySQL và verify các constraints (`CHECK`, `UNIQUE(work_id)`).
- Viết module kết nối pool `src/config/database.ts` và test `SELECT 1`.

### Ngày 2: Tích hợp Open Library & Book APIs
- Viết `src/services/openLibraryService.ts`: Gọi Open Library Search API và Works Details API có handle timeout/fallback.
- Viết `src/repositories/libraryRepository.ts`: Viết hàm kiểm tra tồn tại theo `work_id` hoặc danh sách `work_ids`.
- Hiện thực `GET /api/v1/books`: Phân trang kết quả, nối với DB MySQL để gán `inLibrary: boolean` và `id: number | null`.
- Hiện thực `GET /api/v1/books/:workId`: Trả chi tiết tác phẩm (từ MySQL nếu đã lưu, hoặc từ Open Library nếu chưa).
- Viết Unit/Integration test cơ bản với mock Open Library.

### Ngày 3: Triển khai Nghiệp vụ Tủ sách (Library APIs)
- Hiện thực `POST /api/v1/library`: Validate input, check duplicate (409), fetch metadata, insert DB và gán ngày bắt đầu nếu status = 1.
- Hiện thực `GET /api/v1/library`: Lọc theo `status`, phân trang `page` & `limit`, tính toán `progressPercent`.
- Hiện thực `PATCH /api/v1/library/:id`: Xử lý business logic trang hiện tại, tự động kết thúc (`status = 2`), ghi nhận `started_at`/`finished_at`, validate rating 0–5 và note string.
- Hiện thực `DELETE /api/v1/library/:id`: Xóa bản ghi trong MySQL.

### Ngày 4: Hoàn thiện Validation, Error Handling & Tích hợp với Frontend
- Rà soát toàn bộ Zod validation schemas (`bookValidation.ts`, `libraryValidation.ts`) cho Query, Params và Body.
- Kiểm thử tích hợp End-to-End giữa Frontend (Vue 3) và Backend Node.js.
- Kiểm tra tính đúng đắn của CORS, xử lý các headers an toàn qua `helmet`.
- Viết Seed data mẫu (3-5 cuốn sách với các trạng thái khác nhau) để phục vụ test và demo.

### Ngày 5: Deploy Public với HTTPS & Nghiệm thu
- Thiết lập Database MySQL trên cloud (Railway, Aiven, Supabase hoặc VPS).
- Deploy Backend Node.js lên Render / Railway / Fly.io / DigitalOcean.
- Cấu hình domain hoặc URL public có chứng chỉ **HTTPS**.
- Cấu hình CORS chấp nhận domain Frontend public.
- Kiểm tra toàn bộ checklist nghiệm thu.

---

## 10. HƯỚNG DẪN TRIỂN KHAI PRODUCTION & PUBLIC HTTPS

Theo yêu cầu đề bài: **Backend, Frontend và Database phải public và truy cập qua HTTPS**.

### 10.1. Tùy chọn Triển khai Nhanh (PaaS Khuyến nghị)

#### Phương án 1: Render.com (Backend) + Aiven/TiDB (MySQL)
1. **Database:** Tạo MySQL Service miễn phí trên [Aiven](https://aiven.io) hoặc [TiDB Cloud Serverless](https://tidb.cloud). Lấy chuỗi kết nối URI / SSL.
2. **Backend:**
   - Tạo **Web Service** trên Render kết nối với GitHub repo `reading-tracker-be`.
   - Build Command: `npm run build`
   - Start Command: `npm run start` (hoặc `node dist/server.js`)
   - Cấu hình Environment Variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT=10000`, `CORS_ORIGIN=https://<your-fe>.vercel.app`.
   - Render tự động cấp chứng chỉ **HTTPS (SSL/TLS)** miễn phí cho domain `https://<service-name>.onrender.com`.

#### Phương án 2: Railway.app (Toàn bộ Fullstack: MySQL + Node.js)
1. Thêm plugin **MySQL** trong cùng Project trên Railway.
2. Thêm Service Backend từ repo GitHub.
3. Liên kết biến môi trường tự động (`${{MySQL.MYSQLHOST}}`, `${{MySQL.MYSQL_URL}}`).
4. Generate domain công khai (tự động có HTTPS).

### 10.2. Lưu ý An toàn Môi trường Production
- Tuyệt đối không bật debug mode in stack trace lỗi ra response phía client.
- Kiểm tra biến môi trường `NODE_ENV=production`.
- Luôn bật pool connection timeout và graceful shutdown (`process.on('SIGTERM')`).

---

## 11. CHECKLIST KIỂM THỬ & NGHIỆM THU (QA & DELIVERY)

Trước khi bàn giao bài nộp, Backend phải vượt qua 100% các tiêu chí dưới đây:

### 11.1. Nghiệp vụ & Ràng buộc Đề bài
- [ ] **Ràng buộc Gateway:** Frontend không gửi bất kỳ HTTP request nào tới domain Open Library. Backend là đầu mối duy nhất.
- [ ] **Lưu trữ MySQL:** Toàn bộ sách trong tủ sách được lưu trữ trong MySQL. Khi restart server, dữ liệu vẫn giữ nguyên vẹn.
- [ ] **Chống trùng sách:** Gọi `POST /api/v1/library` cùng một `workId` lần thứ 2 trả về chính xác HTTP `409 Conflict`.
- [ ] **Trạng thái & Tiến độ:**
  - [ ] Khi `currentPage == totalPages > 0`, backend tự động chuyển `status` sang `2` (Đã đọc).
  - [ ] `currentPage` bị từ chối (HTTP 400) nếu `< 0` hoặc `> totalPages`.
  - [ ] Chuyển trạng thái sang `1` lần đầu tiên ghi nhận `startedAt`.
  - [ ] Chuyển trạng thái sang `2` ghi nhận `finishedAt`. Chuyển ngược lại thì reset `finishedAt = null`.
- [ ] **Đánh giá & Ghi chú:**
  - [ ] `rating` nhận các giá trị nguyên `0, 1, 2, 3, 4, 5`. Từ chối `null` hoặc giá trị ngoài khoảng.
  - [ ] `note` nhận chuỗi (tối đa 2000 ký tự), mặc định là `""`, từ chối `null`.

### 11.2. Chuẩn hóa Định dạng & Lỗi
- [ ] Tất cả API thành công đều có cấu trúc `{ "data": ... }` (và `meta` nếu có phân trang).
- [ ] Tất cả API thất bại đều trả về `{ "error": { "code": "...", "message": "...", "details": ... } }`.
- [ ] Đúng HTTP Status Codes: `200` (OK), `201` (Created), `400` (Bad Request), `404` (Not Found), `409` (Conflict), `500` (Internal Error).

### 11.3. Deploy & Bàn giao
- [ ] API backend public truy cập được qua giao thức **HTTPS**.
- [ ] Database MySQL public an toàn, đã chạy migrations `schema.sql`.
- [ ] CORS đã cấu hình đúng để Frontend có thể gửi request mà không bị block.
- [ ] Có dữ liệu mẫu (Seed data) giúp người chấm bài kiểm tra ngay lập tức.
