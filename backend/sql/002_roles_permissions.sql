-- ============================================
-- AURIGESTION
-- ROLES & PERMISSIONS
-- ============================================

-- ============================================
-- 1. ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID
        REFERENCES companies(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(module, action)
);

-- ============================================
-- 3. ROLE PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL
        REFERENCES roles(id)
        ON DELETE CASCADE,

    permission_id UUID NOT NULL
        REFERENCES permissions(id)
        ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- 4. INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_roles_company
ON roles(company_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role
ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission
ON role_permissions(permission_id);


-- ============================================
-- 5. PERMISSIONS DE BASE
-- ============================================

INSERT INTO permissions (name, module, action, description)
VALUES

-- EMPLOYES
(
    'Voir les employés',
    'employees',
    'view',
    'Consulter les employés'
),
(
    'Créer un employé',
    'employees',
    'create',
    'Créer un employé'
),
(
    'Modifier un employé',
    'employees',
    'update',
    'Modifier un employé'
),
(
    'Supprimer un employé',
    'employees',
    'delete',
    'Supprimer un employé'
),

-- UTILISATEURS
(
    'Voir les utilisateurs',
    'users',
    'view',
    'Consulter les utilisateurs'
),
(
    'Créer un utilisateur',
    'users',
    'create',
    'Créer un utilisateur'
),
(
    'Modifier un utilisateur',
    'users',
    'update',
    'Modifier un utilisateur'
),
(
    'Supprimer un utilisateur',
    'users',
    'delete',
    'Supprimer un utilisateur'
),

-- CONTRATS
(
    'Voir les contrats',
    'contracts',
    'view',
    'Consulter les contrats'
),
(
    'Créer un contrat',
    'contracts',
    'create',
    'Créer un contrat'
),
(
    'Modifier un contrat',
    'contracts',
    'update',
    'Modifier un contrat'
),

-- PRESENCES
(
    'Voir les présences',
    'attendance',
    'view',
    'Consulter les présences'
),
(
    'Créer une présence',
    'attendance',
    'create',
    'Enregistrer les présences'
),
(
    'Modifier une présence',
    'attendance',
    'update',
    'Modifier les présences'
),

-- PAIE
(
    'Voir la paie',
    'payroll',
    'view',
    'Consulter la paie'
),
(
    'Générer la paie',
    'payroll',
    'create',
    'Générer les bulletins'
),
(
    'Modifier la paie',
    'payroll',
    'update',
    'Modifier les données de paie'
),

-- DEPENSES
(
    'Voir les dépenses',
    'expenses',
    'view',
    'Consulter les dépenses'
),
(
    'Créer une dépense',
    'expenses',
    'create',
    'Créer une dépense'
),
(
    'Modifier une dépense',
    'expenses',
    'update',
    'Modifier une dépense'
),

-- MARCHES
(
    'Voir les marchés',
    'markets',
    'view',
    'Consulter les marchés'
),
(
    'Créer un marché',
    'markets',
    'create',
    'Créer un marché'
),
(
    'Modifier un marché',
    'markets',
    'update',
    'Modifier un marché'
),

-- DEVIS
(
    'Voir les devis',
    'quotes',
    'view',
    'Consulter les devis'
),
(
    'Créer un devis',
    'quotes',
    'create',
    'Créer un devis'
),
(
    'Modifier un devis',
    'quotes',
    'update',
    'Modifier un devis'
),

-- FACTURES
(
    'Voir les factures',
    'invoices',
    'view',
    'Consulter les factures'
),
(
    'Créer une facture',
    'invoices',
    'create',
    'Créer une facture'
),
(
    'Modifier une facture',
    'invoices',
    'update',
    'Modifier une facture'
)

ON CONFLICT (module, action) DO NOTHING;


-- ============================================
-- 6. ROLES PAR DEFAUT
-- ============================================

INSERT INTO roles (
    company_id,
    name,
    slug,
    description
)
SELECT
    id,
    'Directeur',
    'directeur',
    'Accès complet à la gestion de l''entreprise'
FROM companies
WHERE name = 'EGENEM'
AND NOT EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.company_id = companies.id
    AND r.slug = 'directeur'
);


INSERT INTO roles (
    company_id,
    name,
    slug,
    description
)
SELECT
    id,
    'Ressources Humaines',
    'rh',
    'Gestion des employés, contrats et présences'
FROM companies
WHERE name = 'EGENEM'
AND NOT EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.company_id = companies.id
    AND r.slug = 'rh'
);


INSERT INTO roles (
    company_id,
    name,
    slug,
    description
)
SELECT
    id,
    'Comptable',
    'comptable',
    'Gestion financière et paie'
FROM companies
WHERE name = 'EGENEM'
AND NOT EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.company_id = companies.id
    AND r.slug = 'comptable'
);


INSERT INTO roles (
    company_id,
    name,
    slug,
    description
)
SELECT
    id,
    'Secrétaire',
    'secretaire',
    'Accès aux fonctions administratives'
FROM companies
WHERE name = 'EGENEM'
AND NOT EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.company_id = companies.id
    AND r.slug = 'secretaire'
);


-- ============================================
-- 7. PERMISSIONS DU DIRECTEUR
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'directeur'
AND r.company_id = (
    SELECT id
    FROM companies
    WHERE name = 'EGENEM'
    LIMIT 1
)
ON CONFLICT DO NOTHING;


-- ============================================
-- 8. PERMISSIONS RH
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
JOIN permissions p
    ON p.module IN ('employees', 'users', 'contracts', 'attendance')
WHERE r.slug = 'rh'
AND r.company_id = (
    SELECT id
    FROM companies
    WHERE name = 'EGENEM'
    LIMIT 1
)
ON CONFLICT DO NOTHING;


-- ============================================
-- 9. PERMISSIONS COMPTABLE
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
JOIN permissions p
    ON p.module IN ('payroll', 'expenses', 'quotes', 'invoices')
WHERE r.slug = 'comptable'
AND r.company_id = (
    SELECT id
    FROM companies
    WHERE name = 'EGENEM'
    LIMIT 1
)
ON CONFLICT DO NOTHING;


-- ============================================
-- 10. PERMISSIONS SECRETAIRE
-- ============================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
JOIN permissions p
    ON p.module IN ('employees', 'users', 'quotes', 'invoices')
WHERE r.slug = 'secretaire'
AND r.company_id = (
    SELECT id
    FROM companies
    WHERE name = 'EGENEM'
    LIMIT 1
)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (
    name,
    module,
    action,
    description
)
VALUES (
    'Supprimer un contrat',
    'contracts',
    'delete',
    'Supprimer un contrat'
)
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO permissions (
    name,
    module,
    action,
    description
)
VALUES
(
    'Voir les documents',
    'employee_documents',
    'view',
    'Consulter les documents des employés'
),
(
    'Ajouter un document',
    'employee_documents',
    'create',
    'Ajouter un document à un employé'
),
(
    'Modifier un document',
    'employee_documents',
    'update',
    'Modifier les informations d''un document'
),
(
    'Supprimer un document',
    'employee_documents',
    'delete',
    'Supprimer un document'
)
ON CONFLICT (module, action) DO NOTHING;