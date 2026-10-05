-- Relier une règle à une rubrique de paie
ALTER TABLE payroll_rules
ADD COLUMN IF NOT EXISTS component_id UUID
REFERENCES payroll_components(id)
ON DELETE SET NULL;

-- Permettre aux tranches progressives d'appartenir à une règle
ALTER TABLE payroll_tax_brackets
ADD COLUMN IF NOT EXISTS rule_id UUID
REFERENCES payroll_rules(id)
ON DELETE CASCADE;

-- Exonération annuelle éventuelle
ALTER TABLE payroll_rules
ADD COLUMN IF NOT EXISTS annual_exemption_amount NUMERIC(15,2)
DEFAULT 0;

-- Index
CREATE INDEX IF NOT EXISTS idx_payroll_rules_company
ON payroll_rules(company_id);

CREATE INDEX IF NOT EXISTS idx_payroll_rules_component
ON payroll_rules(component_id);

CREATE INDEX IF NOT EXISTS idx_payroll_rules_effective
ON payroll_rules(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_payroll_tax_brackets_rule
ON payroll_tax_brackets(rule_id);