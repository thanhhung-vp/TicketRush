ALTER TABLE events
  ADD COLUMN IF NOT EXISTS queue_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS queue_batch_size INTEGER NOT NULL DEFAULT 50
    CHECK (queue_batch_size BETWEEN 1 AND 500);

CREATE INDEX IF NOT EXISTS idx_events_queue_enabled
  ON events (id)
  WHERE queue_enabled = TRUE;
