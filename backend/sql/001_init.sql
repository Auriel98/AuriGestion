CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================
-- ENTREPRISES
-- =====================================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    legal_name VARCHAR(200),

    nif VARCHAR(100),
    rccm VARCHAR(100),
    cnss VARCHAR(100),

    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,

    logo_url TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- SERVICES
-- =====================================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, name)
);


-- =====================================================
-- EMPLOYÉS
-- =====================================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    service_id UUID
        REFERENCES services(id)
        ON DELETE SET NULL,

    matricule VARCHAR(50) NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(150),
    phone VARCHAR(50),

    birth_date DATE,
    birth_place VARCHAR(150),

    nationality VARCHAR(100)
        DEFAULT 'Gabonaise',

    marital_status VARCHAR(50),

    children_count INTEGER
        DEFAULT 0,

    cnss_number VARCHAR(100),

    position VARCHAR(150),

    hire_date DATE,

    photo_url TEXT,

    status VARCHAR(30)
        NOT NULL DEFAULT 'actif',

    created_at TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, matricule)
);


-- =====================================================
-- UTILISATEURS
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,

    employee_id UUID NOT NULL UNIQUE
        REFERENCES employees(id)
        ON DELETE CASCADE,

    email VARCHAR(150) NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(50)
        NOT NULL DEFAULT 'employe',

    is_active BOOLEAN
        NOT NULL DEFAULT TRUE,

    last_login_at TIMESTAMP,

    created_at TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, email)
);


-- =====================================================
-- INDEX
-- =====================================================

CREATE INDEX idx_services_company
ON services(company_id);

CREATE INDEX idx_employees_company
ON employees(company_id);

CREATE INDEX idx_users_company
ON users(company_id);

CREATE INDEX idx_users_email
ON users(email);