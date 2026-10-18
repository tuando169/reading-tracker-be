# TÀI LIỆU BACKEND — MINI READING TRACKER

> Nguồn: `README.reading-tracker.pdf` (4 trang). **[Bắt buộc]** là yêu cầu trực tiếp từ đề; **[Đề xuất]** là thiết kế triển khai, không phải API/schema do đề cung cấp.

## 1. Tổng quan

| Nội dung | Yêu cầu |
|---|---|
| Backend | Node.js **[Bắt buộc]** |
| Database | MySQL **[Bắt buộc]** |
| Dữ liệu sách | Open Library, miễn phí, không cần API key **[Bắt buộc]** |
| Người dùng | Một người dùng, không yêu cầu đăng nhập **[Bắt buộc]** |
| Kiến trúc, database, API | Ứng viên tự thiết kế **[Bắt buộc]** |
| Deploy | Backend, frontend, database public; truy cập qua HTTPS **[Bắt buộc]** |
| Thời gian | 3–5 ngày kể từ khi nhận đề |

Backend là trung gian duy nhất giữa frontend và Open Library. Frontend **không gọi trực tiếp** Open Library. Dữ liệu tủ sách **phải lưu MySQL**.

## 2. Phạm vi nghiệp vụ Backend

1. Tìm sách theo tên hoặc tác giả, phân trang (mặc định đề xuất 20 kết quả/trang).
2. Trả thông tin sách: ảnh bìa, tên, tác giả, năm xuất bản, mô tả, số trang, subjects.
3. Cho biết sách đã có trong tủ hay chưa.
4. Thêm sách vào tủ và chọn trạng thái ban đầu.
5. Lấy tủ sách, lọc theo trạng thái.
6. Cung cấp danh sách tủ sách để frontend hiển thị và tổng hợp số sách theo trạng thái (không có API thống kê riêng).
7. Cập nhật trang đang đọc, tiến độ phần trăm, trạng thái.
8. Chấm sao 1–5 (chưa đánh giá là 0); ghi chú ngắn (mặc định chuỗi rỗng).
9. Xóa sách khỏi tủ (frontend xác nhận trước khi gửi lệnh xóa).
10. Validate dữ liệu đầu vào và chuẩn hóa lỗi.

## 3. Quy tắc nghiệp vụ [Bắt buộc]

- Không được thêm trùng sách; trả HTTP **409 Conflict**.
- `currentPage >= 0` và `currentPage <= totalPages`.
- `rating` là số nguyên **0–5**; `0` biểu thị chưa đánh giá. Không chấp nhận `null`. `note` luôn là chuỗi, mặc định `""`, không chấp nhận `null`.
- Khi `currentPage == totalPages`, tự động chuyển sang **Đã đọc** (cần xác định cách xử lý khi tổng trang chưa biết).
- Khi chuyển sang **Đang đọc** lần đầu, ghi ngày bắt đầu đọc.
- Khi chuyển sang **Đã đọc**, ghi ngày đọc xong.
- Backend phải validate mọi dữ liệu đầu vào, trả lỗi cùng một cấu trúc và thông báo rõ ràng.

### 3.1. Enum trạng thái [Quy ước triển khai]

| status | Ý nghĩa |
|---|---|
| `0` | Chưa đọc / Muốn đọc |
| `1` | Đang đọc |
| `2` | Đọc xong / Đã đọc |

```js
const ReadingStatus = Object.freeze({
  WANT_TO_READ: 0,
  READING: 1,
  COMPLETED: 2
});
```

### 3.2. Điểm cần thống nhất [Chưa quy định trong PDF]

- Sách không có `totalPages`: có cho nhập thủ công hay không?
- Đặt trạng thái Đã đọc bằng tay có tự đặt `currentPage = totalPages` không?
- Khi chuyển trạng thái ngược, có giữ `finishedAt` hay xóa?
- Có giới hạn độ dài ghi chú không?
- Có cho cập nhật đánh giá sau khi đọc xong không? (đề không giới hạn).

## 4. Tích hợp Open Library [Bắt buộc]

| Mục đích | API phía Open Library |
|---|---|
| Tìm sách | `GET https://openlibrary.org/search.json?q={keyword}&page={n}&limit=20` |
| Chi tiết tác phẩm | `GET https://openlibrary.org/works/{workId}.json` |
| Ảnh bìa | `https://covers.openlibrary.org/b/id/{coverId}-M.jpg` |

Tài liệu: https://openlibrary.org/developers/api

**Thiết kế định danh:** `workId` là ID tác phẩm từ Open Library (ví dụ `OL82563W`); `id` là số nguyên `INT UNSIGNED AUTO_INCREMENT` do MySQL cấp sau khi lưu sách vào tủ. Backend đối chiếu `workId` để xác định sách đã được thêm hay chưa. Frontend nhận được cả hai trường để tìm kiếm/thêm sách và thao tác với bản ghi đã lưu.

- Sách tìm kiếm chưa được thêm: `id: null`, `workId: "OL82563W"`, `inLibrary: false`.
- Sách đã thêm: `id: 1`, `workId: "OL82563W"`, `inLibrary: true`.
- Route `/books/:workId` dùng định danh từ Open Library; route `/library/:id` dùng ID nội bộ của MySQL.
- Open Library có thể thiếu `description`, `number_of_pages`, `coverId`; Backend xử lý thiếu dữ liệu và fallback.

## 5. Thiết kế database [Đề xuất]

Vì không cần tài khoản, chỉ cần bảng `books` (cache thông tin sách đã lưu) kết hợp dữ liệu tiến độ của chính sách đó. Có thể tách `reading_entries` nếu muốn, nhưng không bắt buộc.

### 5.1. Bảng `books`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT PRIMARY KEY | Khóa chính MySQL, giao tiếp FE–BE khi thao tác tủ sách |
| `work_id` | VARCHAR(100) NOT NULL UNIQUE | Work ID từ Open Library; chống thêm trùng tác phẩm |
| `title` | VARCHAR(500) NOT NULL | Tên sách |
| `author` | VARCHAR(500) NULL | Tác giả |
| `cover_url` | TEXT NULL | Ảnh bìa |
| `description` | TEXT NULL | Mô tả |
| `publish_year` | INT NULL | Năm xuất bản |
| `total_pages` | INT UNSIGNED NULL | Tổng trang, có thể chưa biết |
| `subjects` | JSON NULL | Chủ đề |
| `status` | TINYINT UNSIGNED NOT NULL DEFAULT 0 | 0: chưa đọc; 1: đang đọc; 2: đọc xong |
| `current_page` | INT UNSIGNED NOT NULL DEFAULT 0 | Trang hiện tại |
| `rating` | TINYINT UNSIGNED NOT NULL DEFAULT 0 | 0: chưa đánh giá; 1–5: đã đánh giá |
| `note` | VARCHAR(2000) NOT NULL DEFAULT '' | Ghi chú, không null |
| `started_at` | DATETIME NULL | Ngày bắt đầu đọc |
| `finished_at` | DATETIME NULL | Ngày hoàn thành |
| `created_at` | DATETIME NOT NULL | Ngày thêm |
| `updated_at` | DATETIME NOT NULL | Ngày cập nhật |

`UNIQUE(work_id)` bảo đảm không thể thêm trùng cùng tác phẩm, dù `id` nội bộ khác nhau.

### 5.2. SQL tham khảo

```sql
CREATE TABLE books (
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
  CONSTRAINT chk_status CHECK (status IN (0, 1, 2)),
  CONSTRAINT chk_rating CHECK (rating BETWEEN 0 AND 5),
  CONSTRAINT chk_progress CHECK (total_pages IS NULL OR current_page <= total_pages)
);
CREATE INDEX idx_books_status ON books(status);
```

*Dùng VARCHAR(2000) cho `note` để có DEFAULT `''` đơn giản, thay vì TEXT có ràng buộc default tùy phiên bản MySQL.*

## 6. REST API FE–BE [Đề xuất]

Base URL: `/api/v1`. API của Backend (không phải endpoint Open Library).

### 6.1. Quy chuẩn response thống nhất

```ts
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

- Thành công trả `data`, kèm `meta` khi phân trang; lỗi trả `error`.
- `id` của bản ghi tủ sách là **number**, `workId` của Open Library là **string**.
- Với kết quả tìm kiếm chưa lưu MySQL, `id` là `null`; trường `workId` luôn có để thêm vào tủ hoặc xem chi tiết.

### 6.2. Danh sách API

| Method | Endpoint | Request | Response `data` |
|---|---|---|---|
| GET | `/books?keyword=...&page=1&limit=20` | `keyword`, `page`, `limit` | `BookSearchItem[]` (`id`, `workId`, `inLibrary`), `meta` |
| GET | `/books/:workId` | Work ID Open Library | Chi tiết tác phẩm, `id` có thể null |
| GET | `/library?status=1&page=1&limit=20` | `status?`, `page`, `limit` | `LibraryBook[]`, `meta` |
| POST | `/library` | `{workId, status}` | Sách vừa lưu có `id` tự tăng, HTTP 201 |
| PATCH | `/library/:id` | `{status?, currentPage?, rating?, note?}` | Bản ghi đã cập nhật |
| DELETE | `/library/:id` | ID nội bộ | `{id, deleted: true}` |

**Không triển khai `GET /library/stats`.** Frontend có thể tính số liệu từ toàn bộ dữ liệu tủ sách đã tải; một trang dữ liệu không đại diện tổng toàn tủ.

### 6.3. Tìm kiếm sách

`GET /api/v1/books?keyword=harry&page=1&limit=20`

```json
{
  "data": [{
    "id": null,
    "workId": "OL82563W",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J. K. Rowling",
    "publishYear": 1997,
    "coverUrl": "https://covers.openlibrary.org/b/id/10521270-M.jpg",
    "inLibrary": false
  }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Nếu sách đã lưu, Backend trả `id` nội bộ (ví dụ `1`) và `inLibrary: true`.

### 6.4. Chi tiết sách

`GET /api/v1/books/OL82563W`

```json
{
  "data": {
    "id": null,
    "workId": "OL82563W",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J. K. Rowling",
    "description": "Example description",
    "publishYear": 1997,
    "totalPages": 223,
    "subjects": ["Fantasy", "Magic"],
    "coverUrl": null,
    "inLibrary": false
  }
}
```

### 6.5. Thêm sách vào tủ

`POST /api/v1/library`

Request:

```json
{ "workId": "OL82563W", "status": 0 }
```

Response `201 Created`:

```json
{
  "data": {
    "id": 1,
    "workId": "OL82563W",
    "title": "Harry Potter and the Philosopher's Stone",
    "status": 0,
    "currentPage": 0,
    "totalPages": 223,
    "progressPercent": 0,
    "rating": 0,
    "note": "",
    "startedAt": null,
    "finishedAt": null
  }
}
```

Backend dùng `workId` để lấy metadata, lưu MySQL và phát sinh `id`; `UNIQUE(work_id)` chặn trùng (HTTP 409). FE không tự sinh `id`.

### 6.6. Danh sách tủ sách

`GET /api/v1/library?status=1&page=1&limit=20`

```json
{
  "data": [{
    "id": 1,
    "workId": "OL82563W",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J. K. Rowling",
    "coverUrl": null,
    "status": 1,
    "currentPage": 100,
    "totalPages": 223,
    "progressPercent": 44.84,
    "rating": 4,
    "note": "Đọc rất cuốn",
    "startedAt": "2026-10-18T03:00:00.000Z",
    "finishedAt": null
  }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 6.7. Cập nhật tiến độ, trạng thái, đánh giá, ghi chú

`PATCH /api/v1/library/1`

Request:

```json
{ "status": 1, "currentPage": 120, "rating": 5, "note": "Rất hay" }
```

Response `200 OK`:

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
    "note": "Rất hay",
    "startedAt": "2026-10-18T03:00:00.000Z",
    "finishedAt": null
  }
}
```

`rating` nhận số nguyên 0–5, không null; gửi 0 để xóa đánh giá. `note` nhận chuỗi, không null; gửi `""` để xóa ghi chú. Khi `currentPage == totalPages > 0`, Backend tự chuyển sang `status = 2` và ghi `finishedAt`.

### 6.8. Xóa sách khỏi tủ

`DELETE /api/v1/library/1`

```json
{ "data": { "id": 1, "deleted": true } }
```

*Các ID, tiêu đề, metadata và thời gian ở trên là dữ liệu minh họa.*

### 6.9. Lỗi thống nhất

Ví dụ `409 Conflict`:

```json
{
  "error": {
    "code": "BOOK_ALREADY_EXISTS",
    "message": "Sách đã tồn tại trong tủ sách"
  }
}
```

Ví dụ `400 Bad Request`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": { "rating": "Điểm đánh giá phải là số nguyên từ 0 đến 5" }
  }
}
```

| HTTP | Trường hợp đề xuất |
|---|---|
| 400 | Query, body, enum, trang hoặc rating không hợp lệ |
| 404 | Không tìm thấy sách/bản ghi tủ sách |
| 409 | Thêm sách trùng |
| 429 | Upstream giới hạn request (nếu có) |
| 502 | Không nhận được dữ liệu hợp lệ từ Open Library |
| 503 | Open Library không sẵn sàng |
| 500 | Lỗi nội bộ |

## 7. Luồng xử lý [Đề xuất]

### 7.1. Tìm kiếm

Frontend → `GET /books` → Backend validate query → Open Library Search API → Backend chuẩn hóa kết quả và đối chiếu `workId` với `work_id` trong MySQL → trả kết quả + `inLibrary` + phân trang.

### 7.2. Thêm sách

Frontend → `POST /library` với `workId` → Backend validate → kiểm tra trùng `work_id` → lấy metadata sách → insert MySQL (tự sinh `id`) → trả 201; nếu trùng trả 409.

### 7.3. Cập nhật tiến độ

Frontend → `PATCH /library/:id` (ID tự tăng) → Backend lấy bản ghi → validate trang/rating/status → cập nhật ngày bắt đầu/hoàn thành → tính tiến độ → lưu MySQL → trả dữ liệu mới.

## 8. Checklist kiểm thử Backend [Đề xuất]

- [ ] Tìm theo tên sách và tác giả; phân trang đúng.
- [ ] Trả `inLibrary` và `id: null`/`id: number` chính xác theo `workId`.
- [ ] Chi tiết sách xử lý được trường metadata thiếu.
- [ ] Thêm mới từ `workId` thành công, sinh `id` tự tăng; `work_id` trùng trả 409.
- [ ] Lọc tủ sách theo status 0/1/2.
- [ ] Danh sách tủ và phân trang phản ánh đúng dữ liệu MySQL (không có API thống kê riêng).
- [ ] Từ chối `currentPage < 0` hoặc vượt `totalPages`.
- [ ] `rating` nhận số nguyên 0–5, mặc định 0, không nhận null; `note` mặc định `""`, không nhận null.
- [ ] Khi đọc đủ trang, tự chuyển status 2 và ghi ngày hoàn thành.
- [ ] Khi bắt đầu đọc lần đầu, ghi `startedAt`.
- [ ] Cập nhật ghi chú/đánh giá và xóa sách thành công.
- [ ] API thành công trả `{ data, meta? }`; API lỗi trả `{ error: { code, message, details? } }`.
- [ ] Backend không lộ credentials và frontend không gọi Open Library trực tiếp.
- [ ] HTTPS, dữ liệu mẫu và khả năng truy cập public hoạt động.

---

**Nguồn đối chiếu:** Trang 1: công nghệ, phạm vi, màn hình tìm kiếm/chi tiết; trang 2: tủ sách, Open Library, nghiệp vụ; trang 3: deploy và bàn giao; trang 4: README và lưu ý. Các endpoint FE–BE, SQL, JSON ví dụ, kiến trúc và các lựa chọn xử lý chưa nêu trong đề đều là **đề xuất**.
