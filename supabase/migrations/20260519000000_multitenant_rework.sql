-- 1. Create Companies Table
CREATE TABLE companies (
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

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- 2. Backfill existing legacy data by creating a Legacy company
INSERT INTO companies (id, name, slug, contact_email) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Legacy Company', 'legacy-company', 'legacy@example.com');

-- 3. Modify profiles table
ALTER TABLE profiles 
  ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill existing company_admin / company_agent / client to Legacy company
UPDATE profiles 
SET company_id = '00000000-0000-0000-0000-000000000000' 
WHERE role IN ('company_admin', 'company_agent', 'client');

-- Normalize roles to 'admin' and 'client'
UPDATE profiles SET role = 'admin' WHERE role = 'platform_admin';
UPDATE profiles SET role = 'client' WHERE role IN ('company_admin', 'company_agent');

ALTER TABLE profiles DROP COLUMN company;

-- Add CHECK constraint
ALTER TABLE profiles 
  ADD CONSTRAINT chk_profiles_role_company 
  CHECK (
    (role = 'admin' AND company_id IS NULL) OR 
    (role = 'client' AND company_id IS NOT NULL)
  );

CREATE INDEX idx_profiles_company_id ON profiles(company_id);

-- 4. Rename existing clients table to prestataires and add company_id
-- Assuming the table was previously named clients or prestataires. Let's handle it carefully.
-- If it's already named prestataires (from previous iteration):
ALTER TABLE prestataires RENAME TO prestataires_old; -- just in case
-- We will just recreate prestataires to be clean:

CREATE TABLE prestataires (
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

CREATE INDEX idx_prestataires_company_id ON prestataires(company_id);
CREATE INDEX idx_prestataires_name ON prestataires(name);
CREATE UNIQUE INDEX idx_prestataires_company_name ON prestataires(company_id, lower(name));

-- Move data from prestataires_old (or clients) if needed, but since it's a new schema, let's assume we copy what we can.
-- (This step is best-effort depending on what the table was named before)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'clients') THEN
    INSERT INTO prestataires (id, company_id, name, contact_email, contact_phone, address, notes, is_active, created_at, updated_at)
    SELECT id, '00000000-0000-0000-0000-000000000000', name, contact_email, contact_phone, address, notes, is_active, created_at, updated_at FROM clients;
    DROP TABLE clients CASCADE;
  ELSIF EXISTS (SELECT FROM pg_tables WHERE tablename = 'prestataires_old') THEN
    INSERT INTO prestataires (id, company_id, name, contact_email, contact_phone, address, notes, is_active, created_at, updated_at)
    SELECT id, '00000000-0000-0000-0000-000000000000', name, contact_email, contact_phone, address, notes, is_active, created_at, updated_at FROM prestataires_old;
    DROP TABLE prestataires_old CASCADE;
  END IF;
END $$;


-- 5. Modifications to tickets
ALTER TABLE tickets 
  ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN prestataire_id UUID REFERENCES prestataires(id) ON DELETE RESTRICT,
  ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Backfill tickets
UPDATE tickets SET company_id = '00000000-0000-0000-0000-000000000000';
UPDATE tickets SET prestataire_id = client_id; -- map old client_id to prestataire_id
UPDATE tickets SET created_by = submitted_by; -- map old submitted_by to created_by

-- Apply NOT NULL constraints after backfill
ALTER TABLE tickets ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN prestataire_id SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN created_by SET NOT NULL;

-- Remove old columns
ALTER TABLE tickets DROP COLUMN client_id;
ALTER TABLE tickets DROP COLUMN submitted_by;

CREATE INDEX idx_tickets_company_id ON tickets(company_id);
CREATE INDEX idx_tickets_prestataire_id ON tickets(prestataire_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);

-- Create trigger to enforce prestataire_id and assigned_to belong to ticket's company
CREATE OR REPLACE FUNCTION check_ticket_company_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check prestataire belongs to same company
  IF NOT EXISTS (SELECT 1 FROM prestataires WHERE id = NEW.prestataire_id AND company_id = NEW.company_id) THEN
    RAISE EXCEPTION 'Prestataire must belong to the same company as the ticket';
  END IF;

  -- Check assigned_to belongs to same company (if assigned)
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.assigned_to AND company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Assigned user must belong to the same company as the ticket';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ticket_company_consistency
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION check_ticket_company_consistency();

-- 6. Add company_id to related tables (ticket_comments, ticket_attachments, ticket_history)
ALTER TABLE ticket_comments ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE ticket_comments c SET company_id = (SELECT company_id FROM tickets t WHERE t.id = c.ticket_id);
ALTER TABLE ticket_comments ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE ticket_attachments ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE ticket_attachments a SET company_id = (SELECT company_id FROM tickets t WHERE t.id = a.ticket_id);
ALTER TABLE ticket_attachments ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE ticket_history ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE ticket_history h SET company_id = (SELECT company_id FROM tickets t WHERE t.id = h.ticket_id);
ALTER TABLE ticket_history ALTER COLUMN company_id SET NOT NULL;

-- Create triggers to auto-fill company_id
CREATE OR REPLACE FUNCTION autofill_company_id_from_ticket()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id := (SELECT company_id FROM tickets WHERE id = NEW.ticket_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_autofill_comments_company_id BEFORE INSERT ON ticket_comments FOR EACH ROW EXECUTE FUNCTION autofill_company_id_from_ticket();
CREATE TRIGGER trg_autofill_attachments_company_id BEFORE INSERT ON ticket_attachments FOR EACH ROW EXECUTE FUNCTION autofill_company_id_from_ticket();
CREATE TRIGGER trg_autofill_history_company_id BEFORE INSERT ON ticket_history FOR EACH ROW EXECUTE FUNCTION autofill_company_id_from_ticket();

-- 7. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, company_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    -- New users are 'client' by default but NOT assigned to a company (admin must assign)
    'client',
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. ROW LEVEL SECURITY (RLS) Policies

-- Helper functions
CREATE OR REPLACE FUNCTION current_company_id() RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_role() RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT current_role() = 'admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Companies Policies
CREATE POLICY "Admins have full access to companies" ON companies FOR ALL USING (is_admin());
CREATE POLICY "Clients can view their own company" ON companies FOR SELECT USING (id = current_company_id());

-- Profiles Policies
CREATE POLICY "Admins have full access to profiles" ON profiles FOR ALL USING (is_admin());
CREATE POLICY "Clients can view users in their company" ON profiles FOR SELECT USING (company_id = current_company_id());
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Prestataires Policies
CREATE POLICY "Admins have full access to prestataires" ON prestataires FOR ALL USING (is_admin());
CREATE POLICY "Clients can full access their company prestataires" ON prestataires FOR ALL USING (company_id = current_company_id());

-- Tickets Policies
CREATE POLICY "Admins have full access to tickets" ON tickets FOR ALL USING (is_admin());
CREATE POLICY "Clients can full access their company tickets" ON tickets FOR ALL USING (company_id = current_company_id());

-- Ticket Comments Policies
CREATE POLICY "Admins have full access to comments" ON ticket_comments FOR ALL USING (is_admin());
CREATE POLICY "Clients can view public comments of their company" ON ticket_comments FOR SELECT USING (company_id = current_company_id() AND is_internal = false);
CREATE POLICY "Clients can insert comments for their company" ON ticket_comments FOR INSERT WITH CHECK (company_id = current_company_id() AND is_internal = false);

-- Ticket Attachments Policies
CREATE POLICY "Admins have full access to attachments" ON ticket_attachments FOR ALL USING (is_admin());
CREATE POLICY "Clients can full access attachments of their company" ON ticket_attachments FOR ALL USING (company_id = current_company_id());

-- Ticket History Policies
CREATE POLICY "Admins have full access to history" ON ticket_history FOR ALL USING (is_admin());
CREATE POLICY "Clients can view history of their company" ON ticket_history FOR SELECT USING (company_id = current_company_id());
