CREATE TABLE IF NOT EXISTS payroll_period_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    period_id UUID NOT NULL
        REFERENCES payroll_periods(id)
        ON DELETE CASCADE,

    employee_id UUID NOT NULL
        REFERENCES employees(id)
        ON DELETE CASCADE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(period_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_period_employees_period
ON payroll_period_employees(period_id);

CREATE INDEX IF NOT EXISTS idx_payroll_period_employees_employee
ON payroll_period_employees(employee_id);