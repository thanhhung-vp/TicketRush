-- ==========================================
-- TicketRush - Migration 010
-- Ticket refunds and transfers
-- ==========================================

CREATE TABLE IF NOT EXISTS ticket_refund_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID NOT NULL,
  order_id      UUID NOT NULL REFERENCES orders(id),
  event_id      UUID NOT NULL REFERENCES events(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  seat_id       UUID REFERENCES seats(id) ON DELETE SET NULL,
  price         NUMERIC(12,0) NOT NULL DEFAULT 0,
  reason        TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  refund_method VARCHAR(30) NOT NULL DEFAULT 'demo',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_refund_requests_one_pending
  ON ticket_refund_requests(ticket_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ticket_refund_requests_user
  ON ticket_refund_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_refund_requests_status
  ON ticket_refund_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS ticket_transfers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id         UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES orders(id),
  event_id          UUID NOT NULL REFERENCES events(id),
  seat_id           UUID REFERENCES seats(id) ON DELETE SET NULL,
  sender_user_id    UUID NOT NULL REFERENCES users(id),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_transfers_one_pending
  ON ticket_transfers(ticket_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender
  ON ticket_transfers(sender_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient
  ON ticket_transfers(recipient_user_id, status, created_at DESC);
