-- =====================================================
-- 006 - REGLES ET PARAMETRES DE PAIE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_rules (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    code VARCHAR(50) NOT NULL,

    name VARCHAR(150) NOT NULL,

    rule_type VARCHAR(40) NOT NULL,

    calculation_method VARCHAR(40) NOT NULL
        DEFAULT 'percentage',

    -- Part salarié
    employee_rate NUMERIC(10,4)
        DEFAULT 0,

    -- Part employeur
    employer_rate NUMERIC(10,4)
        DEFAULT 0,

    -- Montant maximum soumis au calcul
    ceiling_amount NUMERIC(15,2),

    -- Montant minimum
    floor_amount NUMERIC(15,2),

    -- Franchise / exonération
    exemption_amount NUMERIC(15,2)
        DEFAULT 0,

    -- Base utilisée pour le calcul
    base_type VARCHAR(50),

    -- Date de début d'application
    effective_from DATE NOT NULL,

    -- Date de fin d'application
    effective_to DATE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    description TEXT,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(
        company_id,
        code,
        effective_from
    )
);


-- =====================================================
-- INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS
idx_payroll_rules_company
ON payroll_rules(company_id);

CREATE INDEX IF NOT EXISTS
idx_payroll_rules_code
ON payroll_rules(code);

CREATE INDEX IF NOT EXISTS
idx_payroll_rules_dates
ON payroll_rules(effective_from, effective_to);


ALTER TABLE payroll_tax_brackets
ADD COLUMN IF NOT EXISTS effective_from DATE;

ALTER TABLE payroll_tax_brackets
ADD COLUMN IF NOT EXISTS effective_to DATE;