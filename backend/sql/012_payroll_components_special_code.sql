-- 012 - Code spécial et méthode "days" pour les rubriques de paie

ALTER TABLE payroll_components
ADD COLUMN IF NOT EXISTS special_code VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_payroll_components_special_code
ON payroll_components(company_id, special_code);

ALTER TABLE payroll_components
DROP CONSTRAINT IF EXISTS payroll_component_method_check;

ALTER TABLE payroll_components
ADD CONSTRAINT payroll_component_method_check
CHECK (
    calculation_method IN (
        'manual',
        'fixed',
        'percentage',
        'progressive',
        'days'
    )
);