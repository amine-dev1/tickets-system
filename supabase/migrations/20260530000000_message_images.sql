-- ============================================================
-- Allow images / screenshots to be attached to messages.
-- ============================================================
-- The `messages` table was created outside migrations, so this is
-- written idempotently and is safe to run on an existing database.
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS image_url  TEXT,
  ADD COLUMN IF NOT EXISTS image_name TEXT;

-- Image-only messages have no text body — allow content to be empty/NULL.
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
