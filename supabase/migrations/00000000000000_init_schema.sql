-- ============================================================
-- TICKETFLOW — Fresh schema (multi-tenant + missions)
-- ============================================================

-- 1. Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- 2. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_profiles_role_company CHECK (
    (role = 'admin' AND company_id IS NULL) OR
    (role = 'client' AND company_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- 3. Prestataires
CREATE TABLE IF NOT EXISTS prestataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prestataires_company_id ON prestataires(company_id);
CREATE INDEX IF NOT EXISTS idx_prestataires_name ON prestataires(name);

-- 4. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  category TEXT CHECK (category IN ('bug','feature_request','billing','support','other')),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prestataire_id UUID NOT NULL REFERENCES prestataires(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tickets_company_id ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_prestataire_id ON tickets(prestataire_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);

-- 5. Ticket comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- 6. Ticket attachments
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Ticket history
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Missions
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prestataire_id UUID NOT NULL REFERENCES prestataires(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2) CHECK (budget IS NULL OR budget >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_missions_company_id ON missions(company_id);
CREATE INDEX IF NOT EXISTS idx_missions_prestataire_id ON missions(prestataire_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

-- ============================================================
-- Triggers
-- ============================================================

-- Generic updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_uat ON companies;
CREATE TRIGGER trg_companies_uat BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_prestataires_uat ON prestataires;
CREATE TRIGGER trg_prestataires_uat BEFORE UPDATE ON prestataires FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_tickets_uat ON tickets;
CREATE TRIGGER trg_tickets_uat BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_missions_uat ON missions;
CREATE TRIGGER trg_missions_uat BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ticket company consistency
CREATE OR REPLACE FUNCTION check_ticket_company_consistency() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM prestataires WHERE id = NEW.prestataire_id AND company_id = NEW.company_id) THEN
    RAISE EXCEPTION 'Prestataire must belong to ticket''s company';
  END IF;
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.assigned_to AND (company_id = NEW.company_id OR role='admin')) THEN
      RAISE EXCEPTION 'Assignee must belong to ticket''s company';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_company_check ON tickets;
CREATE TRIGGER trg_ticket_company_check BEFORE INSERT OR UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION check_ticket_company_consistency();

-- Mission consistency
CREATE OR REPLACE FUNCTION check_mission_company_consistency() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM prestataires WHERE id = NEW.prestataire_id AND company_id = NEW.company_id) THEN
    RAISE EXCEPTION 'Prestataire must belong to mission''s company';
  END IF;
  IF NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date cannot be earlier than start_date';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mission_check ON missions;
CREATE TRIGGER trg_mission_check BEFORE INSERT OR UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION check_mission_company_consistency();

-- Auto-fill company_id on ticket children
CREATE OR REPLACE FUNCTION autofill_company_id_from_ticket() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM tickets WHERE id = NEW.ticket_id);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_autofill_comments ON ticket_comments;
CREATE TRIGGER trg_autofill_comments BEFORE INSERT ON ticket_comments FOR EACH ROW EXECUTE FUNCTION autofill_company_id_from_ticket();
DROP TRIGGER IF EXISTS trg_autofill_attachments ON ticket_attachments;
CREATE TRIGGER trg_autofill_attachments BEFORE INSERT ON ticket_attachments FOR EACH ROW EXECUTE FUNCTION autofill_company_id_from_ticket();
DROP TRIGGER IF EXISTS trg_autofill_history ON ticket_history;
CREATE TRIGGER trg_autofill_history BEFORE INSERT ON ticket_history FOR EACH ROW EXECUTE FUNCTION autofill_company_id_from_ticket();

-- New user → profile
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, company_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 'client', NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS
-- ============================================================

CREATE OR REPLACE FUNCTION current_company_id() RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestataires     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins all companies" ON companies;
CREATE POLICY "admins all companies" ON companies FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients view own company" ON companies;
CREATE POLICY "clients view own company" ON companies FOR SELECT USING (id = current_company_id());

DROP POLICY IF EXISTS "admins all profiles" ON profiles;
CREATE POLICY "admins all profiles" ON profiles FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients view company profiles" ON profiles;
CREATE POLICY "clients view company profiles" ON profiles FOR SELECT USING (company_id = current_company_id());
DROP POLICY IF EXISTS "users update own profile" ON profiles;
CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "admins all prestataires" ON prestataires;
CREATE POLICY "admins all prestataires" ON prestataires FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients all company prestataires" ON prestataires;
CREATE POLICY "clients all company prestataires" ON prestataires FOR ALL USING (company_id = current_company_id());

DROP POLICY IF EXISTS "admins all tickets" ON tickets;
CREATE POLICY "admins all tickets" ON tickets FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients all company tickets" ON tickets;
CREATE POLICY "clients all company tickets" ON tickets FOR ALL USING (company_id = current_company_id());

DROP POLICY IF EXISTS "admins all comments" ON ticket_comments;
CREATE POLICY "admins all comments" ON ticket_comments FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients view public comments" ON ticket_comments;
CREATE POLICY "clients view public comments" ON ticket_comments FOR SELECT USING (company_id = current_company_id() AND is_internal = false);
DROP POLICY IF EXISTS "clients insert comments" ON ticket_comments;
CREATE POLICY "clients insert comments" ON ticket_comments FOR INSERT WITH CHECK (company_id = current_company_id() AND is_internal = false);

DROP POLICY IF EXISTS "admins all attachments" ON ticket_attachments;
CREATE POLICY "admins all attachments" ON ticket_attachments FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients all company attachments" ON ticket_attachments;
CREATE POLICY "clients all company attachments" ON ticket_attachments FOR ALL USING (company_id = current_company_id());

DROP POLICY IF EXISTS "admins all history" ON ticket_history;
CREATE POLICY "admins all history" ON ticket_history FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients view history" ON ticket_history;
CREATE POLICY "clients view history" ON ticket_history FOR SELECT USING (company_id = current_company_id());

DROP POLICY IF EXISTS "admins all missions" ON missions;
CREATE POLICY "admins all missions" ON missions FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "clients all company missions" ON missions;
CREATE POLICY "clients all company missions" ON missions FOR ALL USING (company_id = current_company_id());
