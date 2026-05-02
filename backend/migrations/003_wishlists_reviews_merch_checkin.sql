-- ==========================================
-- TicketRush - Migration 003
-- Wishlists, Reviews, Merchandise, Check-in
-- ==========================================

-- Wishlist: user saves an event to follow
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_user  ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_event ON wishlists(event_id);

-- Reviews: one review per user per event (after attending)
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_event ON reviews(event_id);

-- Merchandise: items sold per event
CREATE TABLE IF NOT EXISTS merchandise (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchandise_event ON merchandise(event_id);

-- Order-Merchandise join (which merch items are in which order)
CREATE TABLE IF NOT EXISTS order_merchandise (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  merch_id UUID NOT NULL REFERENCES merchandise(id),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price    NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_merch_order ON order_merchandise(order_id);

-- Check-in: track when a ticket QR was scanned at the gate
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by  UUID REFERENCES users(id);
