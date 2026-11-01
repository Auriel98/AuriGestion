
const pool = require("../../config/db");

/**
 * Récupère les statistiques du tableau de bord
 * pour une entreprise donnée.
 */
const getStatistics = async (companyId) => {
    const query = `
        SELECT
            (
                SELECT COUNT(*)
                FROM employees e
                WHERE e.company_id = $1
                  AND LOWER(e.status) = 'actif'
            ) AS employees,

            (
                SELECT COUNT(*)
                FROM employee_contracts ec
                WHERE ec.company_id = $1
                  AND LOWER(ec.status) = 'actif'
                  AND ec.start_date <= CURRENT_DATE
                  AND (
                      ec.end_date IS NULL
                      OR ec.end_date >= CURRENT_DATE
                  )
            ) AS active_contracts,

            (
                SELECT COUNT(*)
                FROM attendance_records ar
                WHERE ar.company_id = $1
                  AND ar.work_date = CURRENT_DATE
                  AND ar.status = 'worked'
            ) AS today_attendances,

            (
                SELECT COALESCE(SUM(ec.salary_base), 0)
                FROM employee_contracts ec
                WHERE ec.company_id = $1
                  AND LOWER(ec.status) = 'actif'
                  AND ec.start_date <= CURRENT_DATE
                  AND (
                      ec.end_date IS NULL
                      OR ec.end_date >= CURRENT_DATE
                  )
            ) AS payroll_amount
    `;

    const result = await pool.query(query, [companyId]);
    const row = result.rows[0];

    return {
        employees: Number(row.employees),
        activeContracts: Number(row.active_contracts),
        todayAttendances: Number(row.today_attendances),
        payrollAmount: Number(row.payroll_amount)
    };
};

/**
 * Récupère les derniers employés ajoutés
 * pour une entreprise donnée.
 */
const getLatestEmployees = async (companyId, limit = 5) => {
    const query = `
        SELECT
            e.id,
            e.first_name,
            e.last_name,
            e.position,
            e.hire_date,
            e.photo_url
        FROM employees e
        WHERE e.company_id = $1
        ORDER BY e.created_at DESC
        LIMIT $2
    `;

    const result = await pool.query(query, [companyId, limit]);

    return result.rows;
};

/**
 * Récupère le nombre d'employés actifs par service
 * pour une entreprise donnée.
 */
const getEmployeesByDepartment = async (companyId) => {
    const query = `
        SELECT
            COALESCE(s.name, 'Non défini') AS department,
            COUNT(e.id)::INTEGER AS count
        FROM employees e
        LEFT JOIN services s
            ON s.id = e.service_id
        WHERE e.company_id = $1
          AND LOWER(e.status) = 'actif'
        GROUP BY s.id, s.name
        ORDER BY count DESC, department ASC
    `;

    const result = await pool.query(query, [companyId]);

    return result.rows.map((row) => ({
        department: row.department,
        count: Number(row.count)
    }));
};

/**
 * Récupère l'évolution mensuelle des effectifs et des contrats
 * sur les 10 derniers mois pour une entreprise donnée.
 */
const getWorkforceEvolution = async (companyId) => {
    const query = `
        SELECT
            TO_CHAR(m.month_start, 'YYYY-MM') AS month,
            (
                SELECT COUNT(*)
                FROM employees e
                WHERE e.company_id = $1
                  AND e.hire_date <=
                      (m.month_start + INTERVAL '1 month - 1 day')::date
            ) AS employees,
            (
                SELECT COUNT(*)
                FROM employee_contracts ec
                WHERE ec.company_id = $1
                  AND ec.start_date <=
                      (m.month_start + INTERVAL '1 month - 1 day')::date
                  AND (
                      ec.end_date IS NULL
                      OR ec.end_date >=
                         (m.month_start + INTERVAL '1 month - 1 day')::date
                  )
            ) AS contracts
        FROM generate_series(
            DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '9 months',
            DATE_TRUNC('month', CURRENT_DATE),
            INTERVAL '1 month'
        ) AS m(month_start)
        ORDER BY m.month_start ASC
    `;

    const result = await pool.query(query, [companyId]);

    return result.rows.map((row) => ({
        month: row.month,
        employees: Number(row.employees),
        contracts: Number(row.contracts)
    }));
};

/**
 * Récupère les prochaines échéances :
 * fins de contrat, expirations de documents et fins
 * de période de paie.
 */
const getUpcomingDeadlines = async (
    companyId,
    days = 30,
    limit = 5
) => {
    const query = `
        SELECT *
        FROM (
            SELECT
                'contract_end' AS type,
                ec.id,
                TO_CHAR(ec.end_date, 'YYYY-MM-DD') AS due_date,
                ec.end_date AS sort_date,
                e.first_name,
                e.last_name,
                ec.contract_type AS label
            FROM employee_contracts ec
            INNER JOIN employees e
                ON e.id = ec.employee_id
            WHERE ec.company_id = $1
              AND LOWER(ec.status) = 'actif'
              AND ec.end_date BETWEEN
                  CURRENT_DATE AND CURRENT_DATE + $2::int

            UNION ALL

            SELECT
                'document_expiry' AS type,
                ed.id,
                TO_CHAR(ed.expiry_date, 'YYYY-MM-DD') AS due_date,
                ed.expiry_date AS sort_date,
                e.first_name,
                e.last_name,
                ed.title AS label
            FROM employee_documents ed
            INNER JOIN employees e
                ON e.id = ed.employee_id
            WHERE ed.company_id = $1
              AND ed.expiry_date BETWEEN
                  CURRENT_DATE AND CURRENT_DATE + $2::int

            UNION ALL

            SELECT
                'payroll_period_end' AS type,
                pp.id,
                TO_CHAR(pp.end_date, 'YYYY-MM-DD') AS due_date,
                pp.end_date AS sort_date,
                NULL::varchar AS first_name,
                NULL::varchar AS last_name,
                pp.period_year::text || '-' ||
                LPAD(pp.period_month::text, 2, '0') AS label
            FROM payroll_periods pp
            WHERE pp.company_id = $1
              AND pp.status NOT IN ('paid', 'cancelled')
              AND pp.end_date BETWEEN
                  CURRENT_DATE AND CURRENT_DATE + $2::int
        ) deadlines
        ORDER BY sort_date ASC, type ASC
        LIMIT $3
    `;

    const result = await pool.query(
        query,
        [companyId, days, limit]
    );

    return result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        dueDate: row.due_date,
        firstName: row.first_name,
        lastName: row.last_name,
        label: row.label
    }));
};

/**
 * Récupère les dernières activités avec le nom
 * de l'utilisateur ayant effectué chaque action.
 */
const getLatestActivities = async (companyId, limit = 5) => {
    const query = `
        SELECT
            a.id,
            a.activity_type,
            a.title,
            a.description,
            a.user_name,
            a.created_at
        FROM activity_logs a
        WHERE a.company_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2
    `;

    const result = await pool.query(query, [companyId, limit]);

    return result.rows.map((row) => ({
        id: row.id,
        type: row.activity_type,
        title: row.title,
        description: row.description,
        userName: row.user_name,
        createdAt: row.created_at
    }));
};

// Exportation des fonctions du service
module.exports = {
    getStatistics,
    getLatestEmployees,
    getEmployeesByDepartment,
    getWorkforceEvolution,
    getUpcomingDeadlines,
    getLatestActivities
};
