-- ============================================================
-- Master on/off switch for Google Calendar synchronisation.
-- ============================================================
-- When sync_enabled is FALSE the connection is kept (tokens preserved) but
-- no automatic push and no manual sync runs. The user controls this from a
-- switch in the calendar UI. Idempotent.
-- ============================================================

ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN NOT NULL DEFAULT TRUE;
