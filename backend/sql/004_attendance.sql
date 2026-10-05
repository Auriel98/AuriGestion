-- =====================================================
-- 004 - PRESENCE ET POINTAGE
-- =====================================================
-- Principe : Pointage != Paie
-- Le pointage dit seulement si l'employé a travaillé ou non,
-- et conserve éventuellement les heures d'arrivée / départ.
-- Aucun calcul automatique de retard, d'heures travaillées
-- ou d'heures supplémentaires (ceci relève du module Paie).
-- =====================================================


-- =====================================================
-- 0. TABLE DES PARAMETRES D'ENTREPRISE
-- =====================================================
-- Aucun horaire imposé (pas de 08h00-17h00) : le BTP a des
-- horaires variables selon les chantiers.

CREATE TABLE IF NOT EXISTS company_settings (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL UNIQUE
        REFERENCES companies(id)
        ON DELETE CASCADE,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP

);

-- Une ligne de paramètres pour chaque entreprise existante
INSERT INTO company_settings (company_id)
SELECT id
FROM companies
ON CONFLICT (company_id) DO NOTHING;


-- =====================================================
-- 1. TABLE DES PRESENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance_records (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    employee_id UUID NOT NULL
        REFERENCES employees(id)
        ON DELETE CASCADE,

    work_date DATE NOT NULL,

    -- Statut unique de la journée
    status VARCHAR(40) NOT NULL,

    -- Heures optionnelles (jamais obligatoires)
    check_in TIMESTAMP,

    check_out TIMESTAMP,

    -- Note optionnelle (ex : attente du matériel sur le chantier)
    notes TEXT,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    -- -------------------------------------------------
    -- Statuts autorisés
    --   worked        = Travaillé
    --   absent        = Absent
    --   leave         = Congé
    --   sick          = Maladie
    --   not_scheduled = Non programmé (pas de travail prévu,
    --                   ce n'est PAS une absence)
    -- -------------------------------------------------

    CONSTRAINT attendance_status_check
        CHECK (
            status IN (
                'worked',
                'absent',
                'leave',
                'sick',
                'not_scheduled'
            )
        ),


    -- -------------------------------------------------
    -- Les heures n'ont de sens que si l'employé a travaillé
    -- -------------------------------------------------

    CONSTRAINT attendance_hours_only_if_worked
        CHECK (
            status = 'worked'
            OR (check_in IS NULL AND check_out IS NULL)
        ),


    -- -------------------------------------------------
    -- Si les deux heures sont saisies, le départ ne peut pas
    -- précéder l'arrivée
    -- -------------------------------------------------

    CONSTRAINT attendance_check_order
        CHECK (
            check_in IS NULL
            OR check_out IS NULL
            OR check_out >= check_in
        ),


    -- -------------------------------------------------
    -- Un seul pointage par employé et par jour
    -- -------------------------------------------------

    CONSTRAINT attendance_employee_day_unique
        UNIQUE (
            company_id,
            employee_id,
            work_date
        )

);


-- =====================================================
-- 2. INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS
idx_attendance_company
ON attendance_records(company_id);

CREATE INDEX IF NOT EXISTS
idx_attendance_employee
ON attendance_records(employee_id);

CREATE INDEX IF NOT EXISTS
idx_attendance_date
ON attendance_records(work_date);

CREATE INDEX IF NOT EXISTS
idx_attendance_status
ON attendance_records(status);


-- =====================================================
-- 3. PERMISSIONS
-- =====================================================

INSERT INTO permissions (
    name,
    module,
    action,
    description
)
VALUES

(
    'Voir les présences',
    'attendance',
    'view',
    'Consulter les présences des employés'
),

(
    'Enregistrer une présence',
    'attendance',
    'create',
    'Enregistrer une présence'
),

(
    'Modifier une présence',
    'attendance',
    'update',
    'Modifier une présence'
)

ON CONFLICT (module, action)
DO NOTHING;