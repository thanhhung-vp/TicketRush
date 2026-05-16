ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_queue_batch_size_check;

ALTER TABLE events
  ADD CONSTRAINT events_queue_batch_size_check
  CHECK (queue_batch_size BETWEEN 0 AND 500);
