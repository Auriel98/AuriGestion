-- ============================================================
-- 011 - SNAPSHOT DES REGLES FISCALES DES LIGNES DE PAIE
-- ============================================================

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS taxable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS cnss_subject BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS cnamgs_subject BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS tcs_subject BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS irpp_subject BOOLEAN NOT NULL DEFAULT FALSE;


-- Ordre de calcul des règles
ALTER TABLE payroll_rules
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payroll_rules_sort_order
ON payroll_rules(company_id, sort_order);