-- =========================================================
-- AURIGESTION
-- MODULE COMMERCIAL / MARCHÉS / FINANCES
-- =========================================================

-- =========================================================
-- 1. CLIENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    client_type VARCHAR(30) NOT NULL DEFAULT 'entreprise'
        CHECK (client_type IN ('particulier', 'entreprise')),

    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),

    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Gabon',

    nif VARCHAR(100),
    rccm VARCHAR(100),

    notes TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_company
ON clients(company_id);


-- =========================================================
-- 2. SÉQUENCES DES DOCUMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    document_type VARCHAR(30) NOT NULL,
    sequence_year INTEGER NOT NULL,

    last_number INTEGER NOT NULL DEFAULT 0,

    UNIQUE(company_id, document_type, sequence_year)
);


-- =========================================================
-- 3. DEVIS
-- =========================================================

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE RESTRICT,

    quote_number VARCHAR(50) NOT NULL,

    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,

    subject VARCHAR(255),
    notes TEXT,

    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'sent',
                'accepted',
                'rejected',
                'expired',
                'cancelled'
            )
        ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, quote_number)
);

CREATE INDEX IF NOT EXISTS idx_quotes_company
ON quotes(company_id);

CREATE INDEX IF NOT EXISTS idx_quotes_client
ON quotes(client_id);


-- =========================================================
-- 4. LIGNES DE DEVIS
-- =========================================================

CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    quote_id UUID NOT NULL
        REFERENCES quotes(id)
        ON DELETE CASCADE,

    description TEXT NOT NULL,

    quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
    unit VARCHAR(50),

    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote
ON quote_items(quote_id);


-- =========================================================
-- 5. MARCHÉS
-- =========================================================

CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE RESTRICT,

    quote_id UUID
        REFERENCES quotes(id)
        ON DELETE SET NULL,

    market_number VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    start_date DATE,
    end_date DATE,

    contract_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'active',
                'completed',
                'cancelled',
                'suspended'
            )
        ),

    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, market_number)
);

CREATE INDEX IF NOT EXISTS idx_markets_company
ON markets(company_id);

CREATE INDEX IF NOT EXISTS idx_markets_client
ON markets(client_id);


-- =========================================================
-- 6. MOUVEMENTS DE BUDGET
-- =========================================================

CREATE TABLE IF NOT EXISTS market_budget_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    market_id UUID NOT NULL
        REFERENCES markets(id)
        ON DELETE CASCADE,

    movement_type VARCHAR(30) NOT NULL
        CHECK (
            movement_type IN (
                'initial',
                'increase',
                'decrease'
            )
        ),

    amount NUMERIC(15,2) NOT NULL
        CHECK (amount > 0),

    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,

    reference VARCHAR(100),
    reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_movements_market
ON market_budget_movements(market_id);


-- =========================================================
-- 7. FACTURES
-- =========================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE RESTRICT,

    market_id UUID
        REFERENCES markets(id)
        ON DELETE SET NULL,

    quote_id UUID
        REFERENCES quotes(id)
        ON DELETE SET NULL,

    invoice_number VARCHAR(50) NOT NULL,

    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    subject VARCHAR(255),
    notes TEXT,

    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'issued',
                'partially_paid',
                'paid',
                'cancelled'
            )
        ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company
ON invoices(company_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client
ON invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_market
ON invoices(market_id);


-- =========================================================
-- 8. LIGNES DE FACTURES
-- =========================================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    invoice_id UUID NOT NULL
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    description TEXT NOT NULL,

    quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
    unit VARCHAR(50),

    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
ON invoice_items(invoice_id);


-- =========================================================
-- 9. PAIEMENTS CLIENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    invoice_id UUID NOT NULL
        REFERENCES invoices(id)
        ON DELETE CASCADE,

    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    amount NUMERIC(15,2) NOT NULL
        CHECK (amount > 0),

    payment_method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer'
        CHECK (
            payment_method IN (
                'cash',
                'bank_transfer',
                'mobile_money',
                'cheque',
                'other'
            )
        ),

    reference VARCHAR(100),
    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice
ON invoice_payments(invoice_id);


-- =========================================================
-- 10. CATÉGORIES DE DÉPENSES
-- =========================================================

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, name)
);


-- =========================================================
-- 11. DÉPENSES
-- =========================================================

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    market_id UUID
        REFERENCES markets(id)
        ON DELETE SET NULL,

    category_id UUID
        REFERENCES expense_categories(id)
        ON DELETE SET NULL,

    expense_number VARCHAR(50) NOT NULL,

    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

    description TEXT NOT NULL,

    supplier_name VARCHAR(255),

    amount NUMERIC(15,2) NOT NULL
        CHECK (amount > 0),

    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash'
        CHECK (
            payment_method IN (
                'cash',
                'bank_transfer',
                'mobile_money',
                'cheque',
                'other'
            )
        ),

    payment_reference VARCHAR(100),

    receipt_url TEXT,

    notes TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'validated'
        CHECK (
            status IN (
                'draft',
                'validated',
                'cancelled'
            )
        ),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_expenses_company
ON expenses(company_id);

CREATE INDEX IF NOT EXISTS idx_expenses_market
ON expenses(market_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses(expense_date);


-- =========================================================
-- FIN
-- =========================================================