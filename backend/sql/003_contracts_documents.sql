CREATE TABLE IF NOT EXISTS employee_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    employee_id UUID NOT NULL
        REFERENCES employees(id)
        ON DELETE CASCADE,

    contract_type VARCHAR(50) NOT NULL,

    contract_number VARCHAR(100),

    start_date DATE NOT NULL,

    end_date DATE,

    salary_base NUMERIC(15,2),

    position VARCHAR(150),

    trial_period_days INTEGER DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'actif',

    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    employee_id UUID NOT NULL
        REFERENCES employees(id)
        ON DELETE CASCADE,

    contract_id UUID
        REFERENCES employee_contracts(id)
        ON DELETE SET NULL,

    document_type VARCHAR(100) NOT NULL,

    title VARCHAR(200) NOT NULL,

    file_url TEXT NOT NULL,

    file_name VARCHAR(255),

    file_size INTEGER,

    mime_type VARCHAR(100),

    expiry_date DATE,

    notes TEXT,

    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_company
ON employee_contracts(company_id);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee
ON employee_contracts(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_status
ON employee_contracts(status);

CREATE INDEX IF NOT EXISTS idx_employee_documents_company
ON employee_documents(company_id);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee
ON employee_documents(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_documents_contract
ON employee_documents(contract_id);

CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry
ON employee_documents(expiry_date);