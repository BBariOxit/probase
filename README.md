# ProBase

A comprehensive capstone project and thesis management system for universities.

## 🏗 Architecture (Monorepo)

- **Frontend (`probase-app/`)**: Next.js 16 (App Router), React 19, Tailwind CSS, Base-UI / Shadcn UI, TanStack React Query.
- **Backend (`probase-api/`)**: NestJS 11, Prisma 7 ORM, PostgreSQL 17, JWT Authentication, Socket.io.
- **Reverse Proxy (`nginx/`)**: Nginx Alpine acting as the unified gateway on port 80.
- **Database & Cache**: PostgreSQL 17 and Redis 7.

---

## 🚀 Getting Started with Docker Compose

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)
- Node.js 22+ (if running services locally without Docker)

### 2. Environment Setup
Copy the sample environment configuration:
```bash
cp .env.example .env
```

### 3. Launch Services
Start all 5 services with live code mounting and hot reload:
```bash
docker compose up --build
```
*(Add the `-d` flag to run in background: `docker compose up -d --build`)*

The system automatically:
1. Waits for PostgreSQL and Redis to be fully healthy (`healthcheck`).
2. Runs Prisma migrations (`npx prisma migrate deploy`) to prepare all database tables.
3. Enables **Hot Reload & Bind Mount** for instantaneous frontend and backend code synchronization.

### 4. Seed Initial Data
Once the containers are running, populate the database with demo accounts, topics, and master data:
```bash
docker compose exec api npx prisma db seed
```

---

## 🌐 Port Mapping & Endpoints

| Service | Endpoint | Description |
| :--- | :--- | :--- |
| **Nginx (Main Gateway)** | `http://localhost` | Unified gateway (`/` -> Frontend, `/api/` -> Backend), WebSocket enabled |
| **Frontend (Next.js)** | `http://localhost:3000` | User interface (Direct access) |
| **Backend API (NestJS)** | `http://localhost:3001` | REST API & Socket.io (Direct access) |
| **PostgreSQL** | `localhost:5432` | Accessible via GUI tools (DBeaver, TablePlus, DataGrip) |
| **Redis** | `localhost:6379` | Accessible via RedisInsight or redis-cli |

---

## 🔑 Demo Accounts (Khoa CNTT - Đại học Đà Lạt)

Tất cả các tài khoản demo đều dùng mật khẩu chung: **`123456`**

| Vai trò thực tế | Họ tên & Chức vụ | Email | Mật khẩu |
| :--- | :--- | :--- | :--- |
| **Trợ lý Giáo vụ Khoa (TLGV / Admin)** | ThS. Nguyễn Thị GVK | `gvgvk@dlu.edu.vn` | `123456` |
| **Ban Chủ nhiệm Khoa (BCN Khoa)** | TS. Trần Văn CNK | `gvcnk@dlu.edu.vn` | `123456` |
| **Tổ trưởng BM Kỹ thuật phần mềm (TTBM KTPM/CNPM)** | TS. An Bình | `gvab@dlu.edu.vn` | `123456` |
| **Tổ trưởng BM Mạng máy tính (TTBM MMT)** | ThS. Chu Đình | `gvcd@dlu.edu.vn` | `123456` |
| **Giảng viên Hướng dẫn & Phản biện** | ThS. Phan Bửu | `gvpb@dlu.edu.vn` | `123456` |
| **Sinh viên 1 (Trưởng nhóm - Lớp KTPM)** | Nguyễn Văn A | `2266666@dlu.edu.vn` | `123456` |
| **Sinh viên 2 (Thành viên - Lớp KTPM)** | Phạm Thị B | `2277777@dlu.edu.vn` | `123456` |
| **Sinh viên 3 (Lớp Mạng máy tính)** | Lê Văn C | `2288888@dlu.edu.vn` | `123456` |

---

## 🛠 Useful Commands

```bash
# View container logs in real time
docker compose logs -f

# Stop all services
docker compose down

# Stop and wipe database/cache volumes
docker compose down -v
```
