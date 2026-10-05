const pool = require("../../config/db");

/**
 * Statistiques globales des périodes de paie
 */
const getPeriodStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE status = 'draft'
        )::int AS draft,

        COUNT(*) FILTER (
          WHERE status = 'calculated'
        )::int AS calculated,

        COUNT(*) FILTER (
          WHERE status = 'validated'
        )::int AS validated,

        COUNT(*) FILTER (
          WHERE status = 'paid'
        )::int AS paid
      FROM payroll_periods
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getPeriodStats :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques.",
    });
  }
};

/**
 * Liste des périodes
 */
const getPeriods = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT
        p.*,

        COUNT(s.id)::int AS slip_count,

        COALESCE(
          SUM(s.gross_salary),
          0
        ) AS total_gross,

        COALESCE(
          SUM(s.employee_deductions),
          0
        ) AS total_deductions,

        COALESCE(
          SUM(s.net_to_pay),
          0
        ) AS total_net

      FROM payroll_periods p

      LEFT JOIN payroll_slips s
        ON s.period_id = p.id
        AND s.company_id = p.company_id

      WHERE p.company_id = $1

      GROUP BY p.id

      ORDER BY
        p.period_year DESC,
        p.period_month DESC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getPeriods :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des périodes.",
    });
  }
};

/**
 * Détail d'une période
 */
const getPeriodById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const periodResult = await pool.query(
      `
      SELECT *
      FROM payroll_periods
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    if (periodResult.rowCount === 0) {
      return res.status(404).json({
        message: "Période de paie introuvable.",
      });
    }

    const slipsResult = await pool.query(
      `
      SELECT
        s.*,

        e.first_name,
        e.last_name,
        e.matricule,
        e.position,
        e.photo_url

      FROM payroll_slips s

      INNER JOIN employees e
        ON e.id = s.employee_id

      WHERE s.period_id = $1
        AND s.company_id = $2

      ORDER BY
        e.last_name ASC,
        e.first_name ASC
      `,
      [id, companyId]
    );

    res.json({
      period: periodResult.rows[0],
      slips: slipsResult.rows,
    });
  } catch (error) {
    console.error("Erreur getPeriodById :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération de la période.",
    });
  }
};

/**
 * Créer une période
 */
const createPeriod = async (req, res) => {
  try {
    const { companyId } = req.user;

    const {
      period_year,
      period_month,
    } = req.body;

    const year = Number(period_year);
    const month = Number(period_month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        message: "Année ou mois invalide.",
      });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

    const endDate = new Date(
      Date.UTC(year, month, 0)
    )
      .toISOString()
      .slice(0, 10);

    const result = await pool.query(
      `
      INSERT INTO payroll_periods (
        company_id,
        period_year,
        period_month,
        start_date,
        end_date,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'draft'
      )
      RETURNING *
      `,
      [
        companyId,
        year,
        month,
        startDate,
        endDate,
      ]
    );

    res.status(201).json({
      message: "Période de paie créée.",
      period: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur createPeriod :", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Cette période de paie existe déjà.",
      });
    }

    res.status(500).json({
      message: "Erreur lors de la création de la période.",
    });
  }
};

/**
 * Modifier le statut
 */
const updatePeriodStatus = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "calculated",
      "validated",
      "paid",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Statut de paie invalide.",
      });
    }

    const result = await pool.query(
      `
      UPDATE payroll_periods
      SET
        status = $1,

        generated_at =
          CASE
            WHEN $1 = 'calculated'
            THEN COALESCE(generated_at, CURRENT_TIMESTAMP)
            ELSE generated_at
          END,

        validated_at =
          CASE
            WHEN $1 = 'validated'
            THEN CURRENT_TIMESTAMP
            ELSE validated_at
          END,

        paid_at =
          CASE
            WHEN $1 = 'paid'
            THEN CURRENT_TIMESTAMP
            ELSE paid_at
          END,

        updated_at = CURRENT_TIMESTAMP

      WHERE id = $2
        AND company_id = $3

      RETURNING *
      `,
      [status, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Période de paie introuvable.",
      });
    }

    res.json({
      message: "Statut de la période mis à jour.",
      period: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updatePeriodStatus :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du statut.",
    });
  }
};

/**
 * Supprimer une période
 *
 * On autorise uniquement les brouillons.
 */
const deletePeriod = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM payroll_periods
      WHERE id = $1
        AND company_id = $2
        AND status = 'draft'
      RETURNING id
      `,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        message:
          "Seule une période en brouillon peut être supprimée.",
      });
    }

    res.json({
      message: "Période de paie supprimée.",
    });
  } catch (error) {
    console.error("Erreur deletePeriod :", error);

    res.status(500).json({
      message: "Erreur lors de la suppression de la période.",
    });
  }
};

/**
 * Employés disponibles pour une période
 */
const getPeriodEmployees = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    // Vérifier que la période appartient à l'entreprise
    const periodResult = await pool.query(
      `
      SELECT id, period_year, period_month, status
      FROM payroll_periods
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    if (periodResult.rowCount === 0) {
      return res.status(404).json({
        message: "Période de paie introuvable.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        e.id,
        e.matricule,
        e.first_name,
        e.last_name,
        e.position,
        e.photo_url,
        e.status,

        CASE
          WHEN pe.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS selected

      FROM employees e

      LEFT JOIN payroll_period_employees pe
        ON pe.employee_id = e.id
        AND pe.period_id = $1

      WHERE e.company_id = $2
        AND e.status = 'actif'

      ORDER BY
        e.last_name ASC,
        e.first_name ASC
      `,
      [id, companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getPeriodEmployees :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des employés.",
    });
  }
};

/**
 * Sélectionner des employés pour une période
 */
const selectPeriodEmployees = async (req, res) => {
  const client = await pool.connect();

  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { employee_ids } = req.body;

    if (!Array.isArray(employee_ids)) {
      return res.status(400).json({
        message: "employee_ids doit être un tableau.",
      });
    }

    // Supprimer les doublons éventuels
    const uniqueEmployeeIds = [...new Set(employee_ids)];

    await client.query("BEGIN");

    // Vérifier la période
    const periodResult = await client.query(
      `
      SELECT id, status
      FROM payroll_periods
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    if (periodResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Période de paie introuvable.",
      });
    }

    if (periodResult.rows[0].status !== "draft") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Les employés ne peuvent être modifiés que lorsque la période est en brouillon.",
      });
    }

    // Vérifier que tous les employés appartiennent à l'entreprise
    if (uniqueEmployeeIds.length > 0) {
      const employeesResult = await client.query(
        `
        SELECT id
        FROM employees
        WHERE company_id = $1
          AND status = 'actif'
          AND id = ANY($2::uuid[])
        `,
        [companyId, uniqueEmployeeIds]
      );

      if (employeesResult.rowCount !== uniqueEmployeeIds.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message:
            "Un ou plusieurs employés sont invalides ou n'appartiennent pas à cette entreprise.",
        });
      }
    }

    // Remplacer la sélection actuelle
    await client.query(
      `
      DELETE FROM payroll_period_employees
      WHERE period_id = $1
      `,
      [id]
    );

    for (const employeeId of uniqueEmployeeIds) {
      await client.query(
        `
        INSERT INTO payroll_period_employees (
          period_id,
          employee_id
        )
        VALUES ($1, $2)
        `,
        [id, employeeId]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Employés sélectionnés pour la période.",
      employee_count: uniqueEmployeeIds.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur selectPeriodEmployees :", error);

    res.status(500).json({
      message: "Erreur lors de la sélection des employés.",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getPeriodStats,
  getPeriods,
  getPeriodById,
  createPeriod,
  updatePeriodStatus,
  deletePeriod,
  getPeriodEmployees,
  selectPeriodEmployees,
};