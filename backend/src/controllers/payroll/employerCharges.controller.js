const pool = require("../../config/db");

/**
 * Identifiant de la société de l'utilisateur connecté.
 * Le token utilise "companyId", la base utilise "company_id".
 */
const getCompanyId = (req) =>
  req.user?.company_id || req.user?.companyId || null;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Année demandée : un nombre, ou null pour "toutes les années".
 */
const parseYear = (value) =>
  value && value !== "all" && Number(value) ? Number(value) : null;

/**
 * Bulletins pris en compte pour les cumuls.
 *  - all       : calculés, validés et payés
 *  - validated : validés et payés uniquement (ce qui est réellement versé)
 */
const getSlipStatuses = (scope) =>
  scope === "validated"
    ? ["validated", "paid"]
    : ["calculated", "validated", "paid"];

/**
 * Montants patronaux agrégés par bulletin.
 * Codes des lignes = `${rule.code}_EMP` (ex. CNSS_EMP_EMP) :
 * classées par préfixe CNSS% / CNAMGS%, le reste = "autres".
 */
const SLIP_CHARGES_CTE = `
  WITH slip_charges AS (
    SELECT
      l.slip_id,
      SUM(l.employer_amount) FILTER (WHERE l.code LIKE 'CNSS%')   AS cnss,
      SUM(l.employer_amount) FILTER (WHERE l.code LIKE 'CNAMGS%') AS cnamgs,
      SUM(l.employer_amount) FILTER (
        WHERE l.code NOT LIKE 'CNSS%' AND l.code NOT LIKE 'CNAMGS%'
      ) AS other,
      SUM(l.employer_amount) AS total
    FROM payroll_slip_lines l
    WHERE l.category = 'employer_contribution'
    GROUP BY l.slip_id
  )
`;

const SUM_COLUMNS = `
  COALESCE(SUM(s.gross_salary), 0) AS gross_salary,
  COALESCE(SUM(c.cnss), 0)         AS cnss_amount,
  COALESCE(SUM(c.cnamgs), 0)       AS cnamgs_amount,
  COALESCE(SUM(c.other), 0)        AS other_amount,
  COALESCE(SUM(c.total), 0)        AS total_amount
`;

const sumRows = (rows) => {
  const sum = (key) => rows.reduce((a, r) => a + Number(r[key] || 0), 0);

  return {
    gross: sum("gross_salary"),
    cnss: sum("cnss_amount"),
    cnamgs: sum("cnamgs_amount"),
    other: sum("other_amount"),
    total: sum("total_amount"),
  };
};

const noCompany = (res) =>
  res.status(400).json({
    success: false,
    message: "Société introuvable pour cet utilisateur.",
  });


// =====================================================
// CHARGES D'UN MOIS
// GET /api/payroll/employer-charges?year=2026&month=11
// =====================================================

const getEmployerCharges = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) return noCompany(res);

    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Période invalide.",
      });
    }

    const params = [companyId, year, month];
    const filters = [];

    if (req.query.service_id) {
      params.push(req.query.service_id);
      filters.push(`e.service_id = $${params.length}`);
    }

    // status vide ou "all" = tous les statuts
    if (req.query.status && req.query.status !== "all") {
      params.push(req.query.status);
      filters.push(`e.status = $${params.length}`);
    }

    const extraWhere = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT
        s.id AS slip_id,
        s.gross_salary,
        e.id AS employee_id,
        e.matricule,
        e.first_name,
        e.last_name,
        e.position,
        e.photo_url,
        e.status,
        sv.id AS service_id,
        sv.name AS service_name,

        COALESCE(SUM(l.employer_amount)
          FILTER (WHERE l.code LIKE 'CNSS%'), 0)   AS cnss_amount,
        COALESCE(MAX(l.base_amount)
          FILTER (WHERE l.code LIKE 'CNSS%'), 0)   AS cnss_base,
        COALESCE(MAX(l.rate)
          FILTER (WHERE l.code LIKE 'CNSS%'), 0)   AS cnss_rate,

        COALESCE(SUM(l.employer_amount)
          FILTER (WHERE l.code LIKE 'CNAMGS%'), 0) AS cnamgs_amount,
        COALESCE(MAX(l.base_amount)
          FILTER (WHERE l.code LIKE 'CNAMGS%'), 0) AS cnamgs_base,
        COALESCE(MAX(l.rate)
          FILTER (WHERE l.code LIKE 'CNAMGS%'), 0) AS cnamgs_rate,

        COALESCE(SUM(l.employer_amount)
          FILTER (WHERE l.code NOT LIKE 'CNSS%'
                    AND l.code NOT LIKE 'CNAMGS%'), 0) AS other_amount,

        COALESCE(SUM(l.employer_amount), 0) AS total_amount
      FROM payroll_slips s
      INNER JOIN payroll_periods p ON p.id = s.period_id
      INNER JOIN employees e       ON e.id = s.employee_id
      LEFT JOIN services sv        ON sv.id = e.service_id
      LEFT JOIN payroll_slip_lines l
             ON l.slip_id = s.id
            AND l.category = 'employer_contribution'
      WHERE s.company_id = $1
        AND p.period_year = $2
        AND p.period_month = $3
        AND s.status <> 'cancelled'
        ${extraWhere}
      GROUP BY s.id, e.id, sv.id
      ORDER BY e.last_name, e.first_name
      `,
      params
    );

    res.json({
      success: true,
      data: { rows, totals: sumRows(rows) },
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// CUMUL
// GET /api/payroll/employer-charges/cumulative?year=2026|all&scope=all|validated
//
// - employees : total cumulé par employé
// - months    : total de la société mois par mois
// - totals    : total général versé par la société
// =====================================================

const getCumulative = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) return noCompany(res);

    const year = parseYear(req.query.year);

    const params = [companyId, getSlipStatuses(req.query.scope)];
    const filters = [];

    if (year) {
      params.push(year);
      filters.push(`p.period_year = $${params.length}`);
    }

    if (req.query.service_id) {
      params.push(req.query.service_id);
      filters.push(`e.service_id = $${params.length}`);
    }

    if (req.query.status && req.query.status !== "all") {
      params.push(req.query.status);
      filters.push(`e.status = $${params.length}`);
    }

    const extraWhere = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const baseFrom = `
      FROM payroll_slips s
      INNER JOIN payroll_periods p ON p.id = s.period_id
      INNER JOIN employees e       ON e.id = s.employee_id
      LEFT JOIN services sv        ON sv.id = e.service_id
      LEFT JOIN slip_charges c     ON c.slip_id = s.id
      WHERE s.company_id = $1
        AND s.status = ANY($2::text[])
        ${extraWhere}
    `;

    const employeesResult = await pool.query(
      `
      ${SLIP_CHARGES_CTE}
      SELECT
        e.id AS employee_id,
        e.matricule,
        e.first_name,
        e.last_name,
        e.position,
        e.photo_url,
        e.status,
        sv.name AS service_name,
        COUNT(s.id) AS months_count,
        ${SUM_COLUMNS}
      ${baseFrom}
      GROUP BY e.id, sv.id
      ORDER BY e.last_name, e.first_name
      `,
      params
    );

    const monthsResult = await pool.query(
      `
      ${SLIP_CHARGES_CTE}
      SELECT
        p.period_year,
        p.period_month,
        COUNT(s.id) AS employees_count,
        ${SUM_COLUMNS}
      ${baseFrom}
      GROUP BY p.period_year, p.period_month
      ORDER BY p.period_year DESC, p.period_month DESC
      `,
      params
    );

    res.json({
      success: true,
      data: {
        employees: employeesResult.rows,
        months: monthsResult.rows,
        totals: {
          ...sumRows(employeesResult.rows),
          months: monthsResult.rows.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// HISTORIQUE D'UN EMPLOYÉ
// GET /api/payroll/employer-charges/employee/:employeeId?year=2026|all
// =====================================================

const getEmployeeHistory = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) return noCompany(res);

    const { employeeId } = req.params;

    if (!UUID_REGEX.test(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Employé invalide.",
      });
    }

    const employeeResult = await pool.query(
      `
      SELECT
        e.id AS employee_id,
        e.matricule,
        e.first_name,
        e.last_name,
        e.position,
        e.photo_url,
        e.status,
        sv.name AS service_name
      FROM employees e
      LEFT JOIN services sv ON sv.id = e.service_id
      WHERE e.id = $1
        AND e.company_id = $2
      `,
      [employeeId, companyId]
    );

    if (employeeResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Employé introuvable.",
      });
    }

    const year = parseYear(req.query.year);

    const params = [companyId, employeeId, getSlipStatuses(req.query.scope)];
    let yearFilter = "";

    if (year) {
      params.push(year);
      yearFilter = `AND p.period_year = $${params.length}`;
    }

    const { rows } = await pool.query(
      `
      ${SLIP_CHARGES_CTE}
      SELECT
        s.id AS slip_id,
        s.status AS slip_status,
        p.period_year,
        p.period_month,
        COALESCE(s.gross_salary, 0) AS gross_salary,
        COALESCE(c.cnss, 0)         AS cnss_amount,
        COALESCE(c.cnamgs, 0)       AS cnamgs_amount,
        COALESCE(c.other, 0)        AS other_amount,
        COALESCE(c.total, 0)        AS total_amount
      FROM payroll_slips s
      INNER JOIN payroll_periods p ON p.id = s.period_id
      LEFT JOIN slip_charges c     ON c.slip_id = s.id
      WHERE s.company_id = $1
        AND s.employee_id = $2
        AND s.status = ANY($3::text[])
        ${yearFilter}
      ORDER BY p.period_year DESC, p.period_month DESC
      `,
      params
    );

    res.json({
      success: true,
      data: {
        employee: employeeResult.rows[0],
        rows,
        totals: { ...sumRows(rows), months: rows.length },
      },
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// SERVICES (filtre)
// =====================================================

const getServices = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) return noCompany(res);

    const { rows } = await pool.query(
      `SELECT id, name FROM services WHERE company_id = $1 ORDER BY name`,
      [companyId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getEmployerCharges,
  getCumulative,
  getEmployeeHistory,
  getServices,
};