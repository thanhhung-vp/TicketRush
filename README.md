# TicketRush

## Khởi động nhanh

### 1. Chạy PostgreSQL + Redis
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
npm install
# Chạy migration tạo bảng
npm run migrate
# Khởi động dev server
npm run dev
```
Backend chạy tại `http://localhost:4000`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend chạy tại `http://localhost:3000`

### 4. Tạo tài khoản Admin
Sau khi register bình thường, đổi role bằng SQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Kiến trúc

| Layer | Stack |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + Socket.io-client + Recharts |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL 16 (row-level locking với `SELECT FOR UPDATE NOWAIT`) |
| Queue/Jobs | BullMQ + Redis (seat release worker) |
| Auth | JWT |

## Tính năng kỹ thuật nổi bật

### Race Condition Prevention
`POST /api/seats/hold` dùng `SELECT FOR UPDATE NOWAIT` trong transaction.
Nếu 2 user cùng click cùng ghế, chỉ 1 transaction thành công, transaction kia nhận lỗi PostgreSQL `55P03`.

### Vòng đời vé
`Available → Locked (10 phút) → Sold / Released`
- BullMQ worker tự động nhả ghế sau 10 phút
- Fallback sweep mỗi 60 giây

### Real-time
Socket.io room `event:{id}` — tất cả client xem cùng sự kiện nhận broadcast khi ghế đổi trạng thái.

### Virtual Queue
Redis Sorted Set + `ZPOPMIN` để admit từng batch 50 người. Admin bật/tắt qua `POST /api/queue/:id/enable`.
