# TicketRush

TicketRush is a full-stack event ticketing platform for browsing events, holding seats in real time, paying for orders, managing QR tickets, and operating an admin console for events, customers, refunds, check-in, news, and support requests.

The project is split into a React/Vite frontend and a Node.js/Express backend backed by PostgreSQL, Redis, BullMQ, and Socket.io.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Quick Start](#quick-start)
- [Docker Full Stack](#docker-full-stack)
- [Production Domain](#production-domain)
- [Default Seed Accounts](#default-seed-accounts)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Frontend Routes](#frontend-routes)
- [Backend API](#backend-api)
- [Database Model](#database-model)
- [Realtime and Background Jobs](#realtime-and-background-jobs)
- [Important Flows](#important-flows)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, TailwindCSS, React Router, i18next, Recharts, Konva |
| Backend | Node.js ESM, Express, Socket.io |
| Database | PostgreSQL 16 |
| Cache and queues | Redis 7, BullMQ |
| Auth | JWT access tokens, refresh token rotation, Google OAuth, Facebook OAuth |
| Validation | Zod |
| Payments | Mock provider, VNPay sandbox-style URL, MoMo sandbox-style request |
| Email | Resend API or SMTP fallback via Nodemailer |
| Storage | Cloudinary for event posters and avatars |
| AI helper | OpenRouter vision endpoint for event title/description from poster image |
| Infra | Docker Compose, nginx frontend container |
| Tests | Vitest, Supertest, Node test runner for frontend utility tests |

## Project Structure

```text
.
+-- backend/
|   +-- migrations/          PostgreSQL migrations and migration runner
|   +-- scripts/             seed and container startup scripts
|   +-- src/
|       +-- routes/          active Express API routes
|       +-- middleware/      JWT auth and admin guards
|       +-- workers/         seat release, virtual queue, scheduled events
|       +-- services/        email, notifications, admin dashboard/tickets, OTP
|       +-- utils/           validation, queue, ticket, seat, layout helpers
|       +-- socket/          Socket.io setup and Redis adapter
|       +-- tests/           backend unit and route tests
+-- frontend/
|   +-- src/
|   |   +-- pages/           active app pages
|   |   +-- components/      shared UI and feature components
|   |   +-- context/         auth and theme providers
|   |   +-- services/        API service wrappers
|   |   +-- utils/           formatting, layout, ticket download, address helpers
|   |   +-- i18n/            Vietnamese and English locale setup
|   |   +-- design/          Tailwind design tokens
|   +-- tests/               frontend utility tests
|   +-- nginx.conf           production SPA and API proxy config
+-- docker-compose.yml       PostgreSQL, Redis, backend, frontend
+-- README.md
```

There are also newer `backend/src/application`, `backend/src/infrastructure`, and `backend/src/interfaces` layers. The current server entrypoint mounts the route files from `backend/src/routes`, while the layered files are available for ongoing architecture migration.

## Core Features

**Customer side**

- Browse public events with featured events, search suggestions, filters, sorting, pagination, and news.
- View event details with schedule, venue, price range, countdown for scheduled sales, reviews, wishlist, merchandise, and seat map preview.
- Enter a virtual waiting room when queue mode is enabled for an event.
- Select seats, hold them temporarily, renew holds, release holds, and proceed to checkout.
- Pay through mock flow or sandbox-style VNPay/MoMo responses.
- View order history, paid tickets, pending orders, ticket QR codes, downloads, refunds, and ticket transfers.
- Manage profile, avatar, password, structured Vietnam address, theme, and language.
- Submit support/feedback requests.

**Admin side**

- Dashboard for revenue, order count, sold seats, event occupancy, and 30-day revenue.
- Event CRUD with draft, scheduled, on-sale, and ended statuses.
- Feature events on the homepage and configure queue batch size per event.
- Upload posters to Cloudinary and generate event copy from poster image through OpenRouter.
- Design venue layouts with rectangular, fan, U-shaped, and custom row layouts through Konva.
- Manage merchandise per event.
- Manage news posts.
- View customer list, customer history, and manually issue or cancel tickets.
- Review support requests and update their status.
- Review, approve, or reject refund requests.
- Scan QR codes for check-in and view check-in stats/history.

## Quick Start

### Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop or local PostgreSQL and Redis

### 1. Start PostgreSQL and Redis

```bash
docker compose up postgres redis -d
```

### 2. Configure backend environment

```powershell
cd backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

For the default Docker Compose database, the `.env.example` database values already match:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketrush
DB_USER=ticketrush
DB_PASSWORD=ticketrush123
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Install, migrate, seed, and run backend

```bash
cd backend
npm ci
npm run migrate
npm run seed
npm run dev
```

Backend runs at `http://localhost:4000`.

Health check:

```bash
curl http://localhost:4000/api/health
```

### 4. Install and run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

Vite proxies `/api` and `/socket.io` to `http://localhost:4000`.

## Docker Full Stack

Build and run all services:

```bash
docker compose up --build -d
```

Services:

| Service | URL or port | Notes |
| --- | --- | --- |
| frontend | `http://localhost` | nginx serves the Vite build |
| backend | `http://localhost:4000` | Express API and Socket.io |
| postgres | `localhost:5432` | database `ticketrush` |
| redis | `localhost:6379` | queue, cache, Socket.io adapter |

The backend container runs `scripts/docker-start.sh`, which applies migrations, seeds only when the `users` table is empty, and then starts `src/server.js`.

Useful Docker commands:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend node migrations/run.js
docker compose exec backend node scripts/seed.js
docker compose down
```

To remove database and Redis volumes too:

```bash
docker compose down -v
```

## Production Domain

The current public domain is:

```text
https://ticketrush.id.vn
```

Use the same origin for the frontend and backend API proxy in production:

```env
NODE_ENV=production
CLIENT_URL=https://ticketrush.id.vn
SERVER_URL=https://ticketrush.id.vn
```

Production callback URLs:

| Integration | URL |
| --- | --- |
| Google OAuth redirect URI | `https://ticketrush.id.vn/api/auth/google/callback` |
| Facebook OAuth redirect URI | `https://ticketrush.id.vn/api/auth/facebook/callback` |
| VNPay return URL | `https://ticketrush.id.vn/payment/return` |
| MoMo redirect URL | `https://ticketrush.id.vn/payment/return` |
| MoMo IPN URL | `https://ticketrush.id.vn/api/payment/momo/ipn` |

When `NODE_ENV=production` and `CLIENT_URL` or `SERVER_URL` is not set, the backend falls back to `https://ticketrush.id.vn`. Set them explicitly in deployment anyway so the environment is self-documenting.

## Default Seed Accounts

After `npm run seed`, these accounts are available:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ticketrush.vn` | `admin123` |
| Customer | `nguyen.van.a@example.com` | `user123` |
| Customer | `tran.thi.b@example.com` | `user123` |

The seed also creates sample on-sale events, zones, and seats.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Do not commit real secrets.

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | Backend port. Defaults to `4000`. |
| `NODE_ENV` | no | Use `development` locally. `production` requires `JWT_SECRET`. |
| `CLIENT_URL` | yes | Frontend origin for CORS and OAuth redirects. Local default `http://localhost:3000`; production fallback `https://ticketrush.id.vn`. |
| `SERVER_URL` | yes | Backend origin for payment and callback URLs. Local default `http://localhost:4000`; production fallback `https://ticketrush.id.vn`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | yes | PostgreSQL connection. |
| `REDIS_HOST`, `REDIS_PORT` | yes | Redis connection. |
| `JWT_SECRET` | production | Long random secret for signing JWTs. |
| `JWT_EXPIRES_IN` | no | Access token TTL. Defaults from config to `7d`; `.env.example` uses `15m`. |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | no | Refresh token TTL in days. Defaults to `7`. |
| `SEAT_HOLD_MINUTES` | no | Seat lock duration. Defaults to `10`. |
| `QUEUE_ADMIT_INTERVAL_MS` | no | Virtual queue worker interval. Defaults to `30000`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for uploads | Event poster and avatar uploads. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | for Google OAuth | Google login. |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` | for Facebook OAuth | Facebook login. |
| `RESEND_API_KEY`, `RESEND_FROM` | optional | Preferred email provider. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | optional | SMTP fallback when Resend is not configured. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | for AI helper | Poster-to-event generation. |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` | optional | VNPay sandbox-style integration. |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT` | optional | MoMo sandbox-style integration. |

## Scripts

Backend:

```bash
cd backend
npm run dev        # node --watch src/server.js
npm start          # node src/server.js
npm run migrate    # apply pending SQL migrations
npm run seed       # insert sample users/events/seats
npm test           # vitest run
npm run test:watch # vitest watch mode
```

Frontend:

```bash
cd frontend
npm run dev        # Vite dev server on port 3000
npm run build      # production build
npm run preview    # preview built app
```

There is no npm script for frontend tests in `frontend/package.json`; the utility tests are plain Node test files under `frontend/tests`.

## Frontend Routes

Active routes are defined in `frontend/src/App.jsx`.

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Homepage, event discovery, featured events, news. |
| `/news/:id` | Public | News detail. |
| `/events/:id` | Public | Event detail, seat map, reviews, wishlist, merchandise. |
| `/login` | Public | Email/password and social login. |
| `/register` | Public | Account creation with structured address fields. |
| `/auth/google/callback` | Public | Frontend Google OAuth completion. |
| `/auth/facebook/callback` | Public | Frontend Facebook OAuth completion. |
| `/forgot-password` | Public | OTP password reset. |
| `/faq` | Public | FAQ. |
| `/terms` | Public | Terms. |
| `/about` | Public | About page. |
| `/support`, `/feedback` | Public | Support request form. |
| `/queue/:eventId` | Authenticated | Waiting room for queue-enabled events. |
| `/checkout` | Authenticated | Payment flow for held seats and merchandise view. |
| `/orders/:orderId/tickets` | Authenticated | Ticket QR display. |
| `/my-tickets` | Authenticated | Orders, ticket actions, transfers, refunds. |
| `/profile` | Authenticated | Profile, avatar, password, address. |
| `/admin` | Admin | Dashboard, events, news, customers, refunds, support. |
| `/admin/events/:id` | Admin | Event editor, layout designer, audience stats, merchandise. |
| `/admin/events/:eventId/checkin` | Admin | QR check-in console. |

## Backend API

All endpoints are mounted under `/api`.

### Health

```text
GET /health
```

### Auth `/api/auth`

```text
POST  /register
POST  /login
GET   /google
GET   /google/callback
GET   /callback/google
POST  /google/complete
GET   /facebook
GET   /facebook/callback
GET   /callback/facebook
POST  /facebook/complete
POST  /refresh
POST  /logout
POST  /logout-all              Bearer
GET   /me                      Bearer
PATCH /profile                 Bearer
PATCH /change-password         Bearer
POST  /forgot-password
POST  /reset-password
```

Notes:

- Email/password registration requires a valid email, password length of at least 6, and `full_name`.
- Refresh tokens are stored hashed in PostgreSQL and rotated on every refresh.
- Password reset OTPs are stored hashed in Redis and are consumed once.
- Google/Facebook OAuth uses a short-lived Redis local auth code before writing tokens to local storage.

### Events `/api/events`

```text
GET    /                         search, category, date, location, price, sort, limit, offset
GET    /suggestions              q=
GET    /featured
GET    /:id
GET    /:id/seats
POST   /                         Admin Bearer
PATCH  /:id                      Admin Bearer
DELETE /:id                      Admin Bearer
POST   /:id/zones                Admin Bearer
DELETE /:id/zones/:zoneId        Admin Bearer
PUT    /:id/layout               Admin Bearer
```

Event status values: `draft`, `scheduled`, `on_sale`, `ended`.

### Seats `/api/seats`

```text
POST /hold       Bearer, body { seat_ids }
POST /renew      Bearer, body { seat_ids }
POST /release    Bearer, body { seat_ids }
```

Rules:

- `seat_ids` must be a non-empty array.
- A hold accepts up to 10 seats.
- Duplicate seats and cross-event seat selections are rejected.
- Held seats use `locked_until` and are released by BullMQ or fallback sweep.

### Payment `/api/payment`

```text
POST /initiate       Bearer, body { seat_ids, method }
POST /confirm        Bearer, body { order_id, method, transaction_id? }
POST /cancel         Bearer, body { order_id }
POST /vnpay/ipn
POST /momo/ipn
```

Supported methods: `mock`, `vnpay`, `momo`.

`/confirm` turns a pending order into a paid order, marks seats sold, creates QR tickets, emits realtime seat updates, creates a notification, and sends confirmation email best-effort.

### Orders `/api/orders`

```text
POST /checkout       Bearer, legacy direct checkout
GET  /               Bearer, my orders
GET  /:id/tickets    Bearer, tickets for an order
```

### Queue `/api/queue`

```text
POST /:eventId/enter           Bearer
GET  /:eventId/status          Bearer
GET  /:eventId/admin-status    Admin Bearer
POST /:eventId/enable          Admin Bearer
POST /:eventId/disable         Admin Bearer
```

Queue state is stored in Redis with sorted sets and TTL-based admission keys.

### Admin `/api/admin`

```text
GET    /events
GET    /dashboard
GET    /news
POST   /news
PATCH  /news/:id
DELETE /news/:id
GET    /stats/audience
GET    /events/:id/audience
GET    /events/:id/seats
GET    /customers
GET    /customers/:id/history
POST   /customers/:id/tickets
DELETE /tickets/:id
GET    /support-requests
PATCH  /support-requests/:id
GET    /refunds
POST   /refunds/:id/approve
POST   /refunds/:id/reject
```

All admin routes require a valid JWT and `role = admin`.

### News `/api/news`

```text
GET /       Public published news list
GET /:id    Public published news detail
```

### Upload `/api/upload`

```text
POST /image     Admin Bearer, multipart field image, max 5 MB
POST /avatar    Bearer, multipart field image, max 8 MB
```

Allowed image types: JPEG, PNG, WebP, GIF.

### Wishlists `/api/wishlists`

```text
GET    /                 Bearer
POST   /:eventId         Bearer
DELETE /:eventId         Bearer
GET    /check/:eventId   Bearer
```

### Reviews `/api/reviews`

```text
GET    /:eventId
GET    /:eventId/mine    Bearer
POST   /:eventId         Bearer
DELETE /:eventId         Bearer
```

### Merchandise `/api/merchandise`

```text
GET    /:eventId
POST   /:eventId             Admin Bearer
PATCH  /:eventId/:merchId    Admin Bearer
DELETE /:eventId/:merchId    Admin Bearer
```

### Check-in `/api/checkin`

```text
POST /                  Admin Bearer, body { qr_code }
GET  /stats/:eventId    Admin Bearer
GET  /list/:eventId     Admin Bearer
```

### Ticket Refunds `/api/ticket-refunds`

```text
POST /tickets/:ticketId    Bearer
GET  /mine                 Bearer
```

Refunds are blocked for missing tickets, transferred tickets, unpaid orders, checked-in tickets, ended events, and tickets with pending transfers.

### Ticket Transfers `/api/ticket-transfers`

```text
GET  /incoming             Bearer
GET  /outgoing             Bearer
POST /tickets/:ticketId    Bearer, body { recipient_email }
POST /:transferId/:action  Bearer, action accept|decline|cancel
```

Transfers are blocked for unpaid orders, checked-in tickets, ended events, pending transfers, pending refunds, unknown recipients, and self-transfers.

### Notifications `/api/notifications`

```text
GET   /              Bearer
PATCH /read-all      Bearer
PATCH /:id/read      Bearer
```

### Support Requests `/api/support-requests`

```text
POST /
```

Body includes `name`, `email`, `type`, and `message`. Admins manage requests through `/api/admin/support-requests`.

### AI `/api/ai`

```text
POST /event-from-image    Admin Bearer, body { image_url }
```

Requires `OPENROUTER_API_KEY`.

## Database Model

Migrations live in `backend/migrations` and are applied in filename order.

Main tables:

| Table | Purpose |
| --- | --- |
| `users` | Customer and admin accounts, profile fields, avatar, structured address. |
| `refresh_tokens` | Hashed refresh tokens with expiry. |
| `events` | Event metadata, category, status, sale schedule, queue settings, layout JSON. |
| `zones` | Seat zones for each event, price, color, matrix size. |
| `seats` | Individual seats, status, lock owner, lock timestamps. |
| `orders` | Customer orders with pending, paid, or cancelled status. |
| `order_items` | Seats included in each order. |
| `tickets` | QR tickets issued after payment or admin issue. |
| `wishlists` | User-saved events. |
| `reviews` | Event reviews. |
| `merchandise` | Event merchandise catalog. |
| `order_merchandise` | Merchandise line items for orders. |
| `admin_ticket_actions` | Audit log for admin ticket issue/cancel actions. |
| `ticket_refund_requests` | Customer refund requests and admin resolution. |
| `ticket_transfers` | Pending and resolved ticket transfer requests. |
| `news_posts` | Public and draft news content. |
| `notifications` | In-app user notifications. |
| `support_requests` | Public support/feedback submissions. |
| `_migrations` | Applied migration tracking. |

Seat statuses:

```text
available
locked
sold
```

Order statuses:

```text
pending
paid
cancelled
```

## Realtime and Background Jobs

**Socket.io**

- Clients join `event:<eventId>` rooms for seat updates.
- Authenticated sockets join `user:<userId>` rooms for notifications and queue admission.
- Redis adapter allows Socket.io broadcasts across multiple backend instances.

**Seat hold release**

- Holding seats schedules BullMQ jobs in the `seat-release` queue.
- Each seat lock has `locked_until`.
- The worker only releases seats whose lock actually expired.
- A fallback sweep runs every 60 seconds in `src/server.js`.

**Virtual queue**

- Queue keys use Redis sorted sets, for example `queue:<eventId>`.
- Admitted users use `admitted:<eventId>` with expiration.
- Admins can enable or disable queues per event and set batch size from 0 to 500.
- The worker admits users every `QUEUE_ADMIT_INTERVAL_MS` or 30 seconds by default.

**Scheduled events**

- The scheduled event worker promotes events from `scheduled` to `on_sale` when `sale_start_at <= NOW()`.

## Important Flows

### Booking and payment

1. User opens an event and loads seats.
2. If queue is enabled, user enters `/queue/:eventId` and waits for admission.
3. User selects seats and calls `/api/seats/hold`.
4. Backend validates seat count, locks rows with PostgreSQL row-level locking, sets `locked_until`, and emits seat updates.
5. User checks out through `/api/payment/initiate`.
6. Backend creates or reuses a pending order for the held seats.
7. User confirms payment through `/api/payment/confirm`.
8. Backend marks the order paid, marks seats sold, creates tickets with QR data URLs, emits realtime updates, creates notifications, and sends email best-effort.

### Ticket refund

1. User requests refund for a paid, owned ticket.
2. Backend checks refund rules and creates a pending refund request.
3. Admin approves or rejects the request.
4. On approval, backend deletes the ticket, removes the order item, frees the seat, recalculates the order total, emits seat updates, and notifies the user.

### Ticket transfer

1. Ticket owner sends a transfer request to another customer email.
2. Recipient sees the incoming request in My Tickets.
3. Recipient accepts or declines; sender may cancel.
4. On accept, backend changes `tickets.user_id` to the recipient and resolves the transfer.

### Admin ticket issue/cancel

Admins can issue a paid ticket directly to a customer or cancel an existing ticket. Both actions write to `admin_ticket_actions`, update seat state, and notify the customer.

## Testing

Backend tests:

```bash
cd backend
npm test
```

Targeted backend tests:

```bash
cd backend
npm test -- src/tests/auth.test.js
npm test -- src/tests/seatAndEventRules.test.js
npm test -- src/tests/payment.test.js
```

Frontend utility tests are plain Node tests:

```bash
cd frontend
node --test tests/*.test.js
```

Production frontend build:

```bash
cd frontend
npm run build
```

## Troubleshooting

**Backend cannot connect to PostgreSQL**

- Check `docker compose ps`.
- Confirm `DB_HOST=localhost` for local host runs.
- If running backend inside Docker Compose, `DB_HOST` must be `postgres` as configured in `docker-compose.yml`.

**Redis or queue errors**

- Start Redis with `docker compose up redis -d`.
- Check `REDIS_HOST` and `REDIS_PORT`.
- Seat release and virtual queue features depend on Redis.

**OAuth login says not configured**

- Add provider credentials to `backend/.env`.
- Keep redirect URIs aligned with frontend/backend URLs.
- Google production redirect: `https://ticketrush.id.vn/api/auth/google/callback`.
- Facebook production redirect: `https://ticketrush.id.vn/api/auth/facebook/callback`.
- Google local redirect in `.env.example`: `http://localhost:4000/api/auth/google/callback`.
- Facebook local redirect in `.env.example`: `http://localhost:4000/api/auth/facebook/callback`.

**Cloudinary upload fails**

- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Use JPEG, PNG, WebP, or GIF.
- Event poster max size is 5 MB; avatar max size is 8 MB.

**AI event generation fails**

- Set `OPENROUTER_API_KEY`.
- The endpoint requires an HTTP or HTTPS `image_url`.

**Seats stay locked**

- Confirm the backend process is running, since it starts the BullMQ worker and fallback sweep.
- Check Redis connectivity.
- Expired seats are released by `seat-release` jobs or the 60-second sweep.

**Frontend API calls fail in dev**

- Run backend on port `4000`.
- Run frontend through Vite on port `3000`.
- Vite proxy is configured in `frontend/vite.config.js`.
