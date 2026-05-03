-- ==========================================
-- TicketRush - Migration 006
-- Admin ticket adjustment audit log
-- ==========================================

CREATE TABLE IF NOT EXISTS admin_ticket_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('added', 'deleted')),
  admin_id    UUID NOT NULL REFERENCES users(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  event_id    UUID NOT NULL REFERENCES events(id),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  ticket_id   UUID,
  seat_id     UUID REFERENCES seats(id) ON DELETE SET NULL,
  price       NUMERIC(12,0) NOT NULL DEFAULT 0,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_ticket_actions_user ON admin_ticket_actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_ticket_actions_event ON admin_ticket_actions(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_ticket_actions_admin ON admin_ticket_actions(admin_id, created_at DESC);
