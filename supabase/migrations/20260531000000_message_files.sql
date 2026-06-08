-- ============================================================
-- Allow documents (PDF, Word, Excel, etc.) to be attached to messages.
-- ============================================================
-- Parallel to image_url/image_name, documents get their own columns so
-- the existing image rendering stays untouched. Written idempotently.
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS file_url  TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT;
