-- ==========================================
-- TicketRush - Initial Schema
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  full_name  VARCHAR(255) NOT NULL,
  gender     VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  birth_year SMALLINT,
  role       VARCHAR(10) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  venue       VARCHAR(255) NOT NULL,
  event_date  TIMESTAMPTZ NOT NULL,
  poster_url  VARCHAR(500),
  status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'on_sale', 'ended')),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zones (Khu vực trong sự kiện, ví dụ: Khu A, Khu VIP)
CREATE TABLE zones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  rows        SMALLINT NOT NULL CHECK (rows > 0),
  cols        SMALLINT NOT NULL CHECK (cols > 0),
  price       NUMERIC(12,0) NOT NULL CHECK (price >= 0),
  color       VARCHAR(20) DEFAULT '#3B82F6'
);

-- Seats (sinh ra từ zones, mỗi ô trong ma trận là 1 seat)
CREATE TABLE seats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id    UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  row_idx    SMALLINT NOT NULL,
  col_idx    SMALLINT NOT NULL,
  label      VARCHAR(20) NOT NULL,  -- e.g. "A-01", "VIP-B3"
  status     VARCHAR(20) NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'locked', 'sold')),
  locked_by  UUID REFERENCES users(id),
  locked_at  TIMESTAMPTZ,
  UNIQUE (zone_id, row_idx, col_idx)
);

CREATE INDEX idx_seats_event_status ON seats(event_id, status);
CREATE INDEX idx_seats_locked_at    ON seats(locked_at) WHERE status = 'locked';

-- Orders
CREATE TABLE orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id),
  event_id     UUID NOT NULL REFERENCES events(id),
  total_amount NUMERIC(14,0) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at      TIMESTAMPTZ
);

-- Order items (một order có thể gồm nhiều ghế)
CREATE TABLE order_items (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seat_id  UUID NOT NULL REFERENCES seats(id),
  price    NUMERIC(12,0) NOT NULL
);

-- Tickets (sau khi thanh toán, mỗi ghế → 1 vé có QR)
CREATE TABLE tickets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  seat_id    UUID NOT NULL REFERENCES seats(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  qr_code    TEXT NOT NULL,
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
