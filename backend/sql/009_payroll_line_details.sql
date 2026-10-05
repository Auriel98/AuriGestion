-- =========================================================
-- 009 - Détails supplémentaires des lignes de paie
-- =========================================================

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS origin VARCHAR(30) NOT NULL DEFAULT 'manual';

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS calculation_mode VARCHAR(30) NOT NULL DEFAULT 'manual';

ALTER TABLE payroll_slip_lines
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Valeurs autorisées pour l'origine
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_slip_line_origin_check'
    ) THEN
        ALTER TABLE payroll_slip_lines
        ADD CONSTRAINT payroll_slip_line_origin_check
        CHECK (origin IN ('manual', 'system'));
    END IF;
END $$;

-- Mode de calcul de la ligne
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payroll_slip_line_calculation_mode_check'
    ) THEN
        ALTER TABLE payroll_slip_lines
        ADD CONSTRAINT payroll_slip_line_calculation_mode_check
        CHECK (
            calculation_mode IN (
                'manual',
                'fixed',
                'quantity_rate',
                'days'
            )
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_slip_lines_slip
ON payroll_slip_lines(slip_id);

CREATE INDEX IF NOT EXISTS idx_payroll_slip_lines_component
ON payroll_slip_lines(component_id);