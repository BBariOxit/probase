# ProBase

Hệ thống quản lý đề tài và đồ án tốt nghiệp sinh viên (ProBase).

## 🏗 Kiến trúc dự án (Monorepo)

- **Frontend (`probase-app/`)**: Next.js 16 (App Router), React 19, TailwindCSS, Base-UI / Shadcn, React Query.
- **Backend (`probase-api/`)**: NestJS 11, Prisma 7, PostgreSQL, JWT Authentication, Socket.io.
- **Reverse Proxy (`nginx/`)**: Nginx Alpine điều phối cổng 80 cho cả Frontend và Backend API.
- **Database & Cache**: PostgreSQL 17 và Redis 7.

---

## 🚀 Khởi chạy với Docker Compose

### 1. Chuẩn bị môi trường
Tạo file cấu hình môi trường từ mẫu:
```bash
cp .env.example .env
```

### 2. Khởi động toàn bộ hệ thống
```bash
docker compose up --build
```
*(Thêm cờ `-d` nếu muốn chạy nền: `docker compose up -d --build`)*

Hệ thống sẽ tự động:
1. Chờ PostgreSQL và Redis sẵn sàng (`healthcheck`).
2. Tự động chạy Prisma migrations để tạo toàn bộ bảng database.
3. Kích hoạt tính năng **Hot Reload & Bind Mount** cho cả BE và FE khi sửa code.

### 3. Nạp dữ liệu mẫu (Seed Data)
Mở một terminal mới tại thư mục gốc và chạy:
```bash
docker compose exec api npx prisma db seed
```

---

## 🌐 Danh sách cổng truy cập

| Dịch vụ | Địa chỉ truy cập | Ghi chú |
| :--- | :--- | :--- |
| **Nginx (Cổng chính)** | `http://localhost` | Proxy toàn bộ FE và BE, hỗ trợ WebSocket |
| **Frontend (Next.js)** | `http://localhost:3000` | Giao diện người dùng |
| **Backend API (NestJS)** | `http://localhost:3001` | API và Socket.io |
| **PostgreSQL** | `localhost:5432` | DBeaver, TablePlus, DataGrip |
| **Redis** | `localhost:6379` | RedisInsight, redis-cli |

---

## 🔑 Tài khoản mẫu (Sau khi chạy Seed)

- **Admin**: `admin@probase.dev` / `Admin@12345`
- **Giảng viên**: `gv001@probase.dev` / `Lecturer@123`
- **Sinh viên**: `2266666@dlu.edu.vn` / `Bao2648@`
