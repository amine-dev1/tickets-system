-- ============================================================
-- Role Hierarchy Refactor
-- ============================================================
-- New roles:
--   superadmin : Global platform access (manages all enterprises)
--   admin      : Enterprise admin (full access within their company)
--   agent      : Enterprise agent (tickets only within their company)
--   client     : End user (existing)
-- ============================================================

-- 1. Drop old CHECK constraints FIRST so we can change role values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_role_company;

-- 2. Migrate global admins (no company_id) → superadmin
UPDATE profiles
SET role = 'superadmin'
WHERE role = 'admin' AND company_id IS NULL;

-- 2b. Clean up orphan profiles (non-superadmin without a company) — they cannot satisfy the new constraint
DELETE FROM profiles
WHERE role IN ('admin', 'agent', 'client') AND company_id IS NULL;

-- 3. Add new constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'admin', 'agent', 'client'));

ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_role_company
  CHECK (
    (role = 'superadmin' AND company_id IS NULL) OR
    (role IN ('admin', 'agent', 'client') AND company_id IS NOT NULL)
  );

-- 4. Update RLS helper functions
CREATE OR REPLACE FUNCTION is_superadmin() RETURNS BOOLEAN AS $func$
  SELECT current_user_role() = 'superadmin';
$func$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_enterprise_admin() RETURNS BOOLEAN AS $func$
  SELECT current_user_role() IN ('superadmin', 'admin');
$func$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $func$
  SELECT current_user_role() IN ('superadmin', 'admin', 'agent');
$func$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $func$
  SELECT current_user_role() IN ('superadmin', 'admin');
$func$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 5. Update RLS policies — global access becomes superadmin-only
DROP POLICY IF EXISTS "Admins have full access to companies" ON companies;
CREATE POLICY "Superadmins have full access to companies" ON companies
  FOR ALL USING (is_superadmin());

DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Superadmins have full access to profiles" ON profiles
  FOR ALL USING (is_superadmin());

DROP POLICY IF EXISTS "Enterprise admins manage company profiles" ON profiles;
CREATE POLICY "Enterprise admins manage company profiles" ON profiles
  FOR ALL USING (current_user_role() = 'admin' AND company_id = current_company_id());

DROP POLICY IF EXISTS "Admins have full access to prestataires" ON prestataires;
CREATE POLICY "Superadmins have full access to prestataires" ON prestataires
  FOR ALL USING (is_superadmin());

DROP POLICY IF EXISTS "Admins have full access to tickets" ON tickets;
CREATE POLICY "Superadmins have full access to tickets" ON tickets
  FOR ALL USING (is_superadmin());

DROP POLICY IF EXISTS "Admins have full access to comments" ON ticket_comments;
CREATE POLICY "Superadmins have full access to comments" ON ticket_comments
  FOR ALL USING (is_superadmin());

DROP POLICY IF EXISTS "Clients can view public comments of their company" ON ticket_comments;
DROP POLICY IF EXISTS "Company staff view internal comments" ON ticket_comments;
CREATE POLICY "Company staff view internal comments" ON ticket_comments
  FOR SELECT USING (
    company_id = current_company_id() AND
    (is_internal = false OR current_user_role() IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "Admins have full access to attachments" ON ticket_attachments;
CREATE POLICY "Superadmins have full access to attachments" ON ticket_attachments
  FOR ALL USING (is_superadmin());

DROP POLICY IF EXISTS "Admins have full access to history" ON ticket_history;
CREATE POLICY "Superadmins have full access to history" ON ticket_history
  FOR ALL USING (is_superadmin());

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
