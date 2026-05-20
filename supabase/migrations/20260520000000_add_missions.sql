-- ============================================================
-- Missions Projet — table for tracking projects assigned to a prestataire
-- ============================================================

-- 1. Table
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prestataire_id UUID NOT NULL REFERENCES prestataires(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12, 2) CHECK (budget IS NULL OR budget >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX idx_missions_company_id ON missions(company_id);
CREATE INDEX idx_missions_prestataire_id ON missions(prestataire_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_created_at ON missions(created_at DESC);

-- 3. Consistency: prestataire must belong to the same company as the mission
CREATE OR REPLACE FUNCTION check_mission_company_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM prestataires
    WHERE id = NEW.prestataire_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Prestataire must belong to the same company as the mission';
  END IF;

  IF NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL
     AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date cannot be earlier than start_date';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_mission_company_consistency
  BEFORE INSERT OR UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION check_mission_company_consistency();

-- 4. Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION set_mission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION set_mission_updated_at();

-- 5. Row Level Security
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to missions"
  ON missions FOR ALL
  USING (is_admin());

CREATE POLICY "Clients can full access their company missions"
  ON missions FOR ALL
  USING (company_id = current_company_id());
