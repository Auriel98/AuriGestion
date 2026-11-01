-- =====================================================
-- 007 - JOURNAL D'AUDIT (qui a fait quoi)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pas de clé étrangère sur company_id : le journal doit survivre
    company_id UUID NOT NULL,

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    -- Nom copié au moment de l'action (reste lisible si l'utilisateur est supprimé)
    user_name VARCHAR(200),

    action VARCHAR(10) NOT NULL
        CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),

    table_name VARCHAR(100) NOT NULL,

    record_id UUID,

    -- INSERT : valeurs créées
    new_data JSONB,

    -- DELETE : valeurs supprimées
    old_data JSONB,

    -- UPDATE : seulement les champs modifiés {"champ": {"old": ..., "new": ...}}
    changed_fields JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
ON audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record
ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs(user_id);


-- L'utilisateur est aussi ajouté au flux du dashboard
ALTER TABLE activity_logs
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS user_name VARCHAR(200);


-- =====================================================
-- Lecture de l'utilisateur transmis par l'application
-- =====================================================

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID AS $$
DECLARE
    v_value TEXT;
BEGIN
    v_value := NULLIF(current_setting('app.user_id', true), '');

    IF v_value IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN v_value::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;


CREATE OR REPLACE FUNCTION current_app_user_name()
RETURNS TEXT AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT CONCAT_WS(' ', e.first_name, e.last_name)
    INTO v_name
    FROM users u
    INNER JOIN employees e ON e.id = u.employee_id
    WHERE u.id = current_app_user_id();

    RETURN v_name;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;


-- =====================================================
-- Trigger générique d'audit
-- =====================================================

CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS TRIGGER AS $$
DECLARE
    v_ignored TEXT[] := ARRAY['updated_at', 'password_hash', 'last_login_at'];
    v_row     JSONB;
    v_changes JSONB;
    v_company UUID;
    v_record  UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_row := to_jsonb(OLD);
    ELSE
        v_row := to_jsonb(NEW);
    END IF;

    v_company := NULLIF(v_row ->> 'company_id', '')::uuid;
    v_record  := NULLIF(v_row ->> 'id', '')::uuid;

    IF v_company IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            company_id, user_id, user_name, action,
            table_name, record_id, new_data
        )
        VALUES (
            v_company, current_app_user_id(), current_app_user_name(), 'INSERT',
            TG_TABLE_NAME, v_record, v_row - 'password_hash'
        );

    ELSIF TG_OP = 'UPDATE' THEN
        SELECT jsonb_object_agg(
                   n.key,
                   jsonb_build_object('old', o.value, 'new', n.value)
               )
        INTO v_changes
        FROM jsonb_each(to_jsonb(NEW) - v_ignored) n
        LEFT JOIN jsonb_each(to_jsonb(OLD) - v_ignored) o ON o.key = n.key
        WHERE n.value IS DISTINCT FROM o.value;

        -- Rien de réellement modifié : on n'écrit rien
        IF v_changes IS NULL THEN
            RETURN NULL;
        END IF;

        INSERT INTO audit_logs (
            company_id, user_id, user_name, action,
            table_name, record_id, changed_fields
        )
        VALUES (
            v_company, current_app_user_id(), current_app_user_name(), 'UPDATE',
            TG_TABLE_NAME, v_record, v_changes
        );

    ELSE
        INSERT INTO audit_logs (
            company_id, user_id, user_name, action,
            table_name, record_id, old_data
        )
        VALUES (
            v_company, current_app_user_id(), current_app_user_name(), 'DELETE',
            TG_TABLE_NAME, v_record, v_row - 'password_hash'
        );
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_logs (%) : %', TG_TABLE_NAME, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- Attacher le trigger aux tables à auditer
-- (une table absente est simplement ignorée)
-- =====================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users',
        'services',
        'employees',
        'employee_contracts',
        'employee_documents',
        'payroll_settings',
        'payroll_components',
        'payroll_periods',
        'payroll_slips',
        'clients',
        'quotes',
        'markets',
        'market_budget_movements',
        'invoices',
        'invoice_payments',
        'expense_categories',
        'expenses'
    ]
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON %1$I', t);
            EXECUTE format(
                'CREATE TRIGGER trg_audit_%1$s
                 AFTER INSERT OR UPDATE OR DELETE ON %1$I
                 FOR EACH ROW EXECUTE FUNCTION audit_row_change()',
                t
            );
        END IF;
    END LOOP;
END $$;


-- =====================================================
-- Ajouter automatiquement l'utilisateur au flux du dashboard
-- (les 5 triggers de 006 n'ont pas à être modifiés)
-- =====================================================

CREATE OR REPLACE FUNCTION activity_logs_set_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := current_app_user_id();
    END IF;

    IF NEW.user_name IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.user_name := current_app_user_name();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activity_logs_set_user ON activity_logs;

CREATE TRIGGER trg_activity_logs_set_user
BEFORE INSERT ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION activity_logs_set_user();