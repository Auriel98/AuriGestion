-- =====================================================
-- 005 - MODULE DE PAIE
-- =====================================================


-- =====================================================
-- 1. PARAMETRES GENERAUX DE PAIE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_settings (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL UNIQUE
        REFERENCES companies(id)
        ON DELETE CASCADE,

    currency VARCHAR(10) NOT NULL DEFAULT 'FCFA',

    monthly_work_days NUMERIC(6,2)
        NOT NULL DEFAULT 30,

    monthly_work_hours NUMERIC(8,2)
        NOT NULL DEFAULT 173.33,

    rounding_decimals INTEGER
        NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 2. RUBRIQUES DE PAIE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_components (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    code VARCHAR(50) NOT NULL,

    name VARCHAR(150) NOT NULL,

    category VARCHAR(40) NOT NULL,

    calculation_method VARCHAR(40) NOT NULL
        DEFAULT 'manual',

    base_code VARCHAR(50),

    rate NUMERIC(10,4),

    fixed_amount NUMERIC(15,2),

    ceiling_amount NUMERIC(15,2),

    floor_amount NUMERIC(15,2),

    taxable BOOLEAN NOT NULL DEFAULT FALSE,

    cnss_subject BOOLEAN NOT NULL DEFAULT FALSE,

    cnamgs_subject BOOLEAN NOT NULL DEFAULT FALSE,

    tcs_subject BOOLEAN NOT NULL DEFAULT FALSE,

    irpp_subject BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT payroll_component_category_check
    CHECK (
        category IN (
            'earning',
            'deduction',
            'employer_contribution',
            'tax',
            'information'
        )
    ),


    CONSTRAINT payroll_component_method_check
    CHECK (
        calculation_method IN (
            'manual',
            'fixed',
            'percentage',
            'progressive'
        )
    ),


    UNIQUE(company_id, code)

);


-- =====================================================
-- 3. TRANCHES DES TAXES PROGRESSIVES
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_tax_brackets (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    component_id UUID NOT NULL
        REFERENCES payroll_components(id)
        ON DELETE CASCADE,

    minimum_amount NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    maximum_amount NUMERIC(15,2),

    rate NUMERIC(10,4)
        NOT NULL DEFAULT 0,

    fixed_amount NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- 4. PERIODES DE PAIE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_periods (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    period_year INTEGER NOT NULL,

    period_month INTEGER NOT NULL,

    start_date DATE NOT NULL,

    end_date DATE NOT NULL,

    status VARCHAR(30) NOT NULL
        DEFAULT 'draft',

    generated_at TIMESTAMP,

    validated_at TIMESTAMP,

    paid_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT payroll_period_month_check
    CHECK (
        period_month BETWEEN 1 AND 12
    ),


    CONSTRAINT payroll_period_status_check
    CHECK (
        status IN (
            'draft',
            'calculated',
            'validated',
            'paid',
            'cancelled'
        )
    ),


    UNIQUE(
        company_id,
        period_year,
        period_month
    )

);


-- =====================================================
-- 5. BULLETINS DE PAIE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_slips (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    period_id UUID NOT NULL
        REFERENCES payroll_periods(id)
        ON DELETE CASCADE,

    employee_id UUID NOT NULL
        REFERENCES employees(id)
        ON DELETE CASCADE,

    contract_id UUID
        REFERENCES employee_contracts(id)
        ON DELETE SET NULL,

    slip_number VARCHAR(100) NOT NULL,

    worked_days NUMERIC(8,2)
        NOT NULL DEFAULT 0,

    paid_days NUMERIC(8,2)
        NOT NULL DEFAULT 0,

    absence_days NUMERIC(8,2)
        NOT NULL DEFAULT 0,

    overtime_hours NUMERIC(8,2)
        NOT NULL DEFAULT 0,

    base_salary NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    gross_salary NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    employee_deductions NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    employer_contributions NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    net_salary NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    net_to_pay NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL
        DEFAULT 'draft',

    payment_method VARCHAR(30),

    payment_reference VARCHAR(150),

    notes TEXT,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT payroll_slip_status_check
    CHECK (
        status IN (
            'draft',
            'calculated',
            'validated',
            'paid',
            'cancelled'
        )
    ),


    UNIQUE(
        company_id,
        period_id,
        employee_id
    ),

    UNIQUE(
        company_id,
        slip_number
    )

);


-- =====================================================
-- 6. LIGNES DU BULLETIN
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_slip_lines (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    slip_id UUID NOT NULL
        REFERENCES payroll_slips(id)
        ON DELETE CASCADE,

    component_id UUID
        REFERENCES payroll_components(id)
        ON DELETE SET NULL,

    code VARCHAR(50) NOT NULL,

    designation VARCHAR(200) NOT NULL,

    category VARCHAR(40) NOT NULL,

    quantity NUMERIC(12,4)
        NOT NULL DEFAULT 1,

    base_amount NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    rate NUMERIC(10,4),

    gain NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    deduction NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    employer_amount NUMERIC(15,2)
        NOT NULL DEFAULT 0,

    sort_order INTEGER
        NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- 7. INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS
idx_payroll_components_company
ON payroll_components(company_id);


CREATE INDEX IF NOT EXISTS
idx_payroll_periods_company
ON payroll_periods(company_id);


CREATE INDEX IF NOT EXISTS
idx_payroll_slips_company
ON payroll_slips(company_id);


CREATE INDEX IF NOT EXISTS
idx_payroll_slips_employee
ON payroll_slips(employee_id);


CREATE INDEX IF NOT EXISTS
idx_payroll_slips_period
ON payroll_slips(period_id);


CREATE INDEX IF NOT EXISTS
idx_payroll_slip_lines_slip
ON payroll_slip_lines(slip_id);


CREATE INDEX IF NOT EXISTS
idx_payroll_tax_brackets_component
ON payroll_tax_brackets(component_id);


-- =====================================================
-- 8. PERMISSIONS
-- =====================================================

INSERT INTO permissions (
    name,
    module,
    action,
    description
)

VALUES

(
    'Voir la paie',
    'payroll',
    'view',
    'Consulter les périodes et bulletins de paie'
),

(
    'Calculer la paie',
    'payroll',
    'create',
    'Calculer une période de paie'
),

(
    'Modifier la paie',
    'payroll',
    'update',
    'Modifier les éléments de paie'
),

(
    'Supprimer un bulletin',
    'payroll',
    'delete',
    'Supprimer un bulletin de paie'
)

ON CONFLICT (module, action)
DO NOTHING;