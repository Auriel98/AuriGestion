-- =====================================================
-- 006 - JOURNAL D'ACTIVITE (alimenté par des triggers)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    activity_type VARCHAR(50) NOT NULL,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    entity_type VARCHAR(50),

    entity_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created
ON activity_logs(company_id, created_at DESC);


-- =====================================================
-- 1. EMPLOYES
-- =====================================================

CREATE OR REPLACE FUNCTION log_employee_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (
        company_id, activity_type, title, description,
        entity_type, entity_id, created_at
    )
    VALUES (
        NEW.company_id,
        'employee_created',
        'Nouvel employé enregistré',
        CONCAT_WS(' ', NEW.first_name, NEW.last_name) || ' a été ajouté',
        'employee',
        NEW.id,
        NEW.created_at
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'activity_logs (employee) : %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_employee_created ON employees;

CREATE TRIGGER trg_log_employee_created
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION log_employee_created();


-- =====================================================
-- 2. CONTRATS
-- =====================================================

CREATE OR REPLACE FUNCTION log_contract_created()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT CONCAT_WS(' ', e.first_name, e.last_name)
    INTO v_name
    FROM employees e
    WHERE e.id = NEW.employee_id;

    INSERT INTO activity_logs (
        company_id, activity_type, title, description,
        entity_type, entity_id, created_at
    )
    VALUES (
        NEW.company_id,
        'contract_created',
        'Contrat créé',
        'Contrat ' || NEW.contract_type || ' - ' || COALESCE(v_name, ''),
        'contract',
        NEW.id,
        NEW.created_at
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'activity_logs (contract) : %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_contract_created ON employee_contracts;

CREATE TRIGGER trg_log_contract_created
AFTER INSERT ON employee_contracts
FOR EACH ROW
EXECUTE FUNCTION log_contract_created();


-- =====================================================
-- 3. PAIE : période qui passe à "calculated"
--    (une seule ligne par période, pas une par bulletin)
-- =====================================================

CREATE OR REPLACE FUNCTION log_payroll_calculated()
RETURNS TRIGGER AS $$
DECLARE
    v_months TEXT[] := ARRAY[
        'janvier','février','mars','avril','mai','juin',
        'juillet','août','septembre','octobre','novembre','décembre'
    ];
    v_count INTEGER;
BEGIN
    IF NEW.status = 'calculated'
       AND OLD.status IS DISTINCT FROM NEW.status THEN

        SELECT COUNT(*) INTO v_count
        FROM payroll_slips ps
        WHERE ps.period_id = NEW.id;

        INSERT INTO activity_logs (
            company_id, activity_type, title, description,
            entity_type, entity_id
        )
        VALUES (
            NEW.company_id,
            'payslip_generated',
            'Bulletin de paie généré',
            'Période de ' || v_months[NEW.period_month] || ' '
                || NEW.period_year || ' - ' || v_count || ' employés',
            'payroll_period',
            NEW.id
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'activity_logs (payroll) : %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_payroll_calculated ON payroll_periods;

CREATE TRIGGER trg_log_payroll_calculated
AFTER UPDATE OF status ON payroll_periods
FOR EACH ROW
EXECUTE FUNCTION log_payroll_calculated();


-- =====================================================
-- 4. DEVIS
-- =====================================================

CREATE OR REPLACE FUNCTION log_quote_created()
RETURNS TRIGGER AS $$
DECLARE
    v_client TEXT;
BEGIN
    SELECT c.name INTO v_client
    FROM clients c
    WHERE c.id = NEW.client_id;

    INSERT INTO activity_logs (
        company_id, activity_type, title, description,
        entity_type, entity_id, created_at
    )
    VALUES (
        NEW.company_id,
        'quote_created',
        'Devis créé',
        NEW.quote_number || ' - Client : ' || COALESCE(v_client, ''),
        'quote',
        NEW.id,
        NEW.created_at
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'activity_logs (quote) : %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_quote_created ON quotes;

CREATE TRIGGER trg_log_quote_created
AFTER INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION log_quote_created();


-- =====================================================
-- 5. PAIEMENTS CLIENTS
-- =====================================================

CREATE OR REPLACE FUNCTION log_payment_received()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice TEXT;
BEGIN
    SELECT i.invoice_number INTO v_invoice
    FROM invoices i
    WHERE i.id = NEW.invoice_id;

    INSERT INTO activity_logs (
        company_id, activity_type, title, description,
        entity_type, entity_id, created_at
    )
    VALUES (
        NEW.company_id,
        'payment_received',
        'Paiement reçu',
        'Facture ' || COALESCE(v_invoice, '') || ' - '
            || REPLACE(TO_CHAR(NEW.amount, 'FM999,999,999,990'), ',', ' ')
            || ' FCFA',
        'invoice_payment',
        NEW.id,
        NEW.created_at
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'activity_logs (payment) : %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_payment_received ON invoice_payments;

CREATE TRIGGER trg_log_payment_received
AFTER INSERT ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION log_payment_received();