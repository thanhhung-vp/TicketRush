-- ==========================================
-- TicketRush - Migration 002
-- ==========================================

-- Add category to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'other'
    CHECK (category IN ('music','sports','arts','conference','comedy','festival','other'));

-- Refresh tokens table for JWT rotation
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
