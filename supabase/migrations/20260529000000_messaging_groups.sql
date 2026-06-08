-- ============================================================
-- Group messaging — extend 1:1 conversations to support
-- multi-member group discussions, optionally linked to a
-- ticket or a mission.
-- ============================================================
-- NOTE: the base `conversations` / `messages` tables were created
-- directly in Supabase (outside migrations). This migration only
-- adds the group-related pieces and is written idempotently so it
-- is safe to run on an existing database.
-- ============================================================

-- 1. Extend conversations with group metadata ------------------
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_group   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name       TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_id  UUID REFERENCES tickets(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

-- For group conversations there is no fixed pair of participants.
ALTER TABLE conversations ALTER COLUMN participant_a DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN participant_b DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_is_group   ON conversations(is_group);
CREATE INDEX IF NOT EXISTS idx_conversations_ticket_id  ON conversations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_conversations_mission_id ON conversations(mission_id);

-- 2. Group membership ------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  is_owner        BOOLEAN NOT NULL DEFAULT false,
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);

-- 3. Row Level Security ----------------------------------------
-- The API uses the service role (bypasses RLS) and enforces access
-- itself, but we still enable RLS + a self-scoped policy as defence
-- in depth for any client that talks to the DB directly.
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins manage all participants" ON conversation_participants;
CREATE POLICY "Superadmins manage all participants"
  ON conversation_participants FOR ALL
  USING (is_superadmin());

DROP POLICY IF EXISTS "Members see their own group memberships" ON conversation_participants;
CREATE POLICY "Members see their own group memberships"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());
