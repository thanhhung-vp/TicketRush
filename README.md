# 🎫 TicketRush

Full-stack ticket booking platform. INT3306 — Spring 2026 (deadline: 11–16/5/2026).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | Node.js ESM + Express + Socket.io |
| Database | PostgreSQL 16 (row-level locking) |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | JWT Access Token (15m) + Refresh Token rotation (30d) |
| Storage | Cloudinary (event poster images) |
| Payment | Mock + VNPay / MoMo (sandbox-ready structure) |
| Validation | Zod |
| Rate limiting | express-rate-limit |
| Infra | Docker Compose |

## Quick Start

### 1. Infrastructure

```bash
docker compose up postgres redis -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in your secrets
npm install
npm run migrate        # run all SQL migrations in order
npm run seed           # seed 5 sample events + admin + users
c           # → http://localhost:4000
```

**Default accounts after seed:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ticketrush.vn | admin123 |
| User A | nguyen.van.a@example.com | user123 |
| User B | tran.thi.b@example.com | user123 |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:3000
```

### 4. Tests

```bash
cd backend
npm test           # 20 unit tests (vitest)
npm run test:watch # watch mode
```

## Features

### Public (User Side)
- **Homepage**: hero, event grid, skeleton loading states
- **Search + filter**: keyword, category pills, date range, location
- **Event detail**: sticky info panel + interactive seat map
- **Real-time seats**: Socket.io broadcasts lock/sold status to all viewers

### Booking Flow
1. Click seats on the map → select up to 8
2. "Hold seats" → `SELECT FOR UPDATE NOWAIT` + 10-min BullMQ timer
3. Choose payment method: **Mock** / **VNPay** / **MoMo**
4. Confirm → QR tickets generated with `qrcode` library
5. Download QR per ticket or view in "My Tickets"

### Authentication
- Register / Login → `{ accessToken, refreshToken }`
- Refresh token rotation (single-use, 30-day expiry)
- All sessions revocable via `/auth/logout-all`
- Role-based routes: `user` / `admin`

### User Dashboard
- `/my-tickets` — order history with seat details
- `/profile` — view + edit full_name, gender, birth_year
- `/orders/:id/tickets` — QR code display + download button

### Admin Dashboard
- Event CRUD (create, edit, delete draft, set status)
- Category selection per event
- Cloudinary poster upload (drag-and-drop in UI)
- Zone + seat generation (matrix, rows × cols)
- Revenue charts (30-day line chart)
- Per-event fill rate progress bars
- Audience demographics: gender (pie), age group (bar)
- Virtual queue management per event

## API Reference

### Auth `/api/auth`
```
POST /register        body: { email, password, full_name, gender?, birth_year? }
POST /login           body: { email, password }
POST /refresh         body: { refreshToken }
POST /logout          body: { refreshToken }
POST /logout-all      Bearer — revoke all sessions
GET  /me              Bearer
PATCH /profile        Bearer — body: { full_name?, gender?, birth_year? }
```

### Events `/api/events`
```
GET  /                ?search=&category=&location=&date_from=&date_to=
GET  /:id             event + zones
GET  /:id/seats       seat grid
POST /                Admin Bearer
PATCH /:id            Admin Bearer
DELETE /:id           Admin Bearer (draft only)
POST /:id/zones       Admin Bearer — body: { name, rows, cols, price, color }
DELETE /:id/zones/:zid Admin Bearer
```

### Payment `/api/payment`
```
POST /initiate        Bearer — body: { seat_ids, method }
                      → { order, payment: { method, payment_url?, ... } }
POST /confirm         Bearer — body: { order_id, method, transaction_id? }
                      → { order, tickets }
POST /cancel          Bearer — body: { order_id }

```

### Seats `/api/seats`
```
POST /hold            Bearer — body: { seat_ids }   (max 10)
POST /release         Bearer — body: { seat_ids }
```

### Orders `/api/orders`
```
GET  /                Bearer — my orders
GET  /:id/tickets     Bearer — tickets for order
POST /checkout        Bearer — legacy direct checkout (no payment step)
```

### Admin `/api/admin`
```
GET  /events          all statuses
GET  /dashboard       revenue + occupancy
GET  /stats/audience  gender + age
GET  /events/:id/seats seat map
```

### Upload `/api/upload`
```
POST /image           Admin Bearer — multipart/form-data { image }
                      → { url, public_id }
```

### Queue `/api/queue`
```
POST /:eventId/enter   Bearer
GET  /:eventId/status  Bearer
POST /:eventId/enable  Admin
POST /:eventId/disable Admin
POST /:eventId/admit   Admin
```

## Database Schema

```sql
users           id, email, password, full_name, gender, birth_year, role, created_at
events          id, title, description, venue, event_date, poster_url, category, status, created_by
zones           id, event_id, name, rows, cols, price, color
seats           id, zone_id, event_id, row_idx, col_idx, label, status, locked_by, locked_at
orders          id, user_id, event_id, total_amount, status, paid_at
order_items     id, order_id, seat_id, price
tickets         id, order_id, seat_id, user_id, qr_code, issued_at
refresh_tokens  id, user_id, token_hash, expires_at, created_at
_migrations     name, applied_at
```

## Docker (Full Stack)

```bash
# Build and run everything
docker compose up --build -d

# Migrate + seed inside the backend container
docker compose exec backend node migrations/run.js
docker compose exec backend node scripts/seed.js
```

Frontend is served on `http://localhost:80` via nginx reverse proxy.

## Architecture Notes

**Seat concurrency**: `SELECT FOR UPDATE NOWAIT` prevents double-booking. Two simultaneous requests for the same seat → one gets 409 immediately (PG error `55P03`).

**Auto seat release**: BullMQ job + 60s fallback sweep. Held seats become available again after `SEAT_HOLD_MINUTES` (default 10).

**Payment flow**: `/payment/initiate` creates a `pending` order (seats stay locked). `/payment/confirm` marks `paid`, releases seats to `sold`, and generates QR tickets in one atomic transaction.

**Token rotation**: On every `/auth/refresh`, the old token is deleted and a new pair issued — stolen refresh tokens can't be reused after detection.

**Virtual queue**: Redis Sorted Set (`ZADD NX`) + `ZPOPMIN` for FIFO batch admission. Socket.io notifies admitted users instantly.

## Environment Variables

Copy `backend/.env.example` → `backend/.env`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random 64+ char string |
| `JWT_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `SEAT_HOLD_MINUTES` | Seat lock duration (default: `10`) |
| `CLOUDINARY_*` | From cloudinary.com dashboard |
| `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` | From sandbox.vnpayment.vn |
| `MOMO_PARTNER_CODE` / `MOMO_ACCESS_KEY` / `MOMO_SECRET_KEY` | From developers.momo.vn |
