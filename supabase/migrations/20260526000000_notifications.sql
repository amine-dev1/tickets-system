-- ============================================================
-- Notifications table
-- ============================================================
-- Per-user in-app notifications. Used when an agent performs
-- ticket/comment actions so that admins are notified.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_company
  ON notifications(company_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own notifications" ON notifications;
CREATE POLICY "Users read their own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users update their own notifications" ON notifications;
CREATE POLICY "Users update their own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users delete their own notifications" ON notifications;
CREATE POLICY "Users delete their own notifications" ON notifications
  FOR DELETE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Superadmins have full access to notifications" ON notifications;
CREATE POLICY "Superadmins have full access to notifications" ON notifications
  FOR ALL USING (is_superadmin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
