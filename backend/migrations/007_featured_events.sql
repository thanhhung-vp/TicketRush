ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_featured_status_date
  ON events (status, event_date)
  WHERE is_featured = TRUE;
