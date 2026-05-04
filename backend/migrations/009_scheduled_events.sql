-- Add 'scheduled' status and sale_start_at column
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'on_sale', 'ended', 'scheduled'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_events_scheduled
  ON events (sale_start_at)
  WHERE status = 'scheduled';
