-- ============================================================
-- Allow voice messages (audio recordings) to be attached to messages.
-- ============================================================
-- Parallel to image_url / file_url, voice notes get their own columns so
-- the existing rendering paths stay untouched. audio_duration holds the
-- recording length in whole seconds (for the player UI). Idempotent.
-- ============================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS audio_url      TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
