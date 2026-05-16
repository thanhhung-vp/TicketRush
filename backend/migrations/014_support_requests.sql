-- ==========================================
-- TicketRush - Migration 014
-- Customer support requests
-- ==========================================

CREATE TABLE IF NOT EXISTS support_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  type        VARCHAR(30) NOT NULL CHECK (type IN ('account', 'technical', 'order', 'payment', 'other')),
  message     TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_requests_status_created
  ON support_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_email_created
  ON support_requests(email, created_at DESC);
