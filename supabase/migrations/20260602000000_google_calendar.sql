-- ============================================================
-- Google Calendar two-way synchronisation.
-- ============================================================
-- Each staff user can connect their own Google account. We store the
-- OAuth tokens per user and a mapping table that links app objects
-- (calendar events & tickets) to the Google event they were pushed to,
-- so updates/deletes can be propagated without creating duplicates.
-- Written idempotently.
-- ============================================================

-- Per-user Google connection (OAuth tokens + sync state).
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  google_email   TEXT,
  access_token   TEXT,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  calendar_id    TEXT NOT NULL DEFAULT 'primary',
  sync_token     TEXT,                       -- Google incremental syncToken (pull)
  push_tickets   BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maps an app object (event or ticket) to the Google event it produced,
-- per user, so the link survives across syncs.
CREATE TABLE IF NOT EXISTS google_calendar_event_map (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type     TEXT NOT NULL CHECK (source_type IN ('event','ticket')),
  source_id       UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_gcal_map_user   ON google_calendar_event_map(user_id);
CREATE INDEX IF NOT EXISTS idx_gcal_map_google ON google_calendar_event_map(google_event_id);

-- Track where a calendar event came from so pulled Google events are
-- mirrored locally without being pushed back as new events.
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'local',  -- 'local' | 'google'
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- These tables are only ever touched by the server (service role), which
-- bypasses RLS. Enable RLS with no policies so nothing is exposed to clients.
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_event_map  ENABLE ROW LEVEL SECURITY;
