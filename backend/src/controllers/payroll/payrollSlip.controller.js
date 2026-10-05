const pool = require("../../config/db");

const {
  calculateSlip,
} = require("../../service/payroll/payrollCalculation.service");

/**
 * Statistiques d'une période de paie
 */
const getSlipStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { periodId } = req.params;

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
        )::int AS paid,

        COALESCE(SUM(gross_salary), 0) AS total_gross,

        COALESCE(SUM(employee_deductions), 0)
          AS total_deductions,

        COALESCE(SUM(employer_contributions), 0)
          AS total_employer_contributions,

        COALESCE(SUM(net_to_pay), 0)
          AS total_net

      FROM payroll_slips
      WHERE company_id = $1
        AND period_id = $2
      `,
      [companyId, periodId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getSlipStats :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques.",
    });
  }
};


/**
 * Liste des bulletins d'une période
 */
const getSlips = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { periodId } = req.params;

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.period_id,
        s.employee_id,
        s.contract_id,
        s.slip_number,

        s.worked_days,
        s.paid_days,
        s.absence_days,
        s.overtime_hours,

        s.base_salary,
        s.gross_salary,
        s.employee_deductions,
        s.employer_contributions,
        s.net_salary,
        s.net_to_pay,

        s.status,
        s.payment_method,
        s.payment_reference,

        e.matricule,
        e.first_name,
        e.last_name,
        e.position,
        e.photo_url

      FROM payroll_slips s

      INNER JOIN employees e
        ON e.id = s.employee_id

      WHERE s.company_id = $1
        AND s.period_id = $2

      ORDER BY
        e.last_name ASC,
        e.first_name ASC
      `,
      [companyId, periodId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getSlips :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des bulletins.",
    });
  }
};


/**
 * Préparer les bulletins
 *
 * Crée un bulletin brouillon pour chaque employé
 * sélectionné dans la période, avec sa ligne SAL_BASE.
 */
const prepareSlips = async (req, res) => {
  const client = await pool.connect();

  try {
    const { companyId } = req.user;
    const { periodId } = req.params;

    await client.query("BEGIN");

    /*
     * Vérifier la période
     */
    const periodResult = await client.query(
      `
      SELECT *
      FROM payroll_periods
      WHERE id = $1
        AND company_id = $2
      FOR UPDATE
      `,
      [periodId, companyId]
    );

    if (periodResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Période de paie introuvable.",
      });
    }

    const period = periodResult.rows[0];

    if (period.status !== "draft") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Les bulletins ne peuvent être préparés que pour une période en brouillon.",
      });
    }

    /*
     * Composant SAL_BASE (chargé une seule fois)
     */
    const baseComponentResult = await client.query(
      `
      SELECT
        id,
        taxable,
        cnss_subject,
        cnamgs_subject,
        tcs_subject,
        irpp_subject
      FROM payroll_components
      WHERE company_id = $1
        AND code = 'SAL_BASE'
        AND is_active = TRUE
      LIMIT 1
      `,
      [companyId]
    );

    const baseComponent = baseComponentResult.rows[0];

    /*
     * Employés sélectionnés
     */
    const employeesResult = await client.query(
      `
      SELECT
        pe.employee_id,

        e.first_name,
        e.last_name,

        c.id AS contract_id,
        c.salary_base,
        c.position

      FROM payroll_period_employees pe

      INNER JOIN employees e
        ON e.id = pe.employee_id

      LEFT JOIN LATERAL (
        SELECT *
        FROM employee_contracts ec
        WHERE ec.employee_id = e.id
          AND ec.company_id = $2
          AND ec.status = 'actif'
        ORDER BY ec.start_date DESC
        LIMIT 1
      ) c
        ON TRUE

      WHERE pe.period_id = $1

      ORDER BY
        e.last_name,
        e.first_name
      `,
      [periodId, companyId]
    );

    if (employeesResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Aucun employé n'est sélectionné pour cette période.",
      });
    }

    let created = 0;
    let existing = 0;

    for (const employee of employeesResult.rows) {
      /*
       * Ne jamais créer deux fois le même bulletin
       */
      const existingSlip = await client.query(
        `
        SELECT id
        FROM payroll_slips
        WHERE company_id = $1
          AND period_id = $2
          AND employee_id = $3
        `,
        [companyId, periodId, employee.employee_id]
      );

      if (existingSlip.rowCount > 0) {
        existing++;
        continue;
      }

      /*
       * Numéro du bulletin
       */
      const slipNumber =
        `PAY-${period.period_year}` +
        `${String(period.period_month).padStart(2, "0")}-` +
        `${String(created + existing + 1).padStart(4, "0")}`;

      /*
       * Salaire de base provenant du contrat.
       * Copié dans le bulletin : si le contrat change plus tard,
       * l'ancien bulletin ne change pas.
       */
      const baseSalary = Number(employee.salary_base || 0);

      const slipInsert = await client.query(
        `
        INSERT INTO payroll_slips (
          company_id,
          period_id,
          employee_id,
          contract_id,
          slip_number,

          worked_days,
          paid_days,
          absence_days,
          overtime_hours,

          base_salary,
          gross_salary,
          employee_deductions,
          employer_contributions,
          net_salary,
          net_to_pay,

          status
        )
        VALUES (
          $1, $2, $3, $4, $5,
          0, 0, 0, 0,
          $6, 0, 0, 0, 0, 0,
          'draft'
        )
        RETURNING id
        `,
        [
          companyId,
          periodId,
          employee.employee_id,
          employee.contract_id || null,
          slipNumber,
          baseSalary,
        ]
      );

      const slipId = slipInsert.rows[0].id;

      /*
       * Ligne "Salaire de base".
       * Le brut est calculé à partir des lignes (colonne gain),
       * donc gain = salaire de base.
       * Les indicateurs fiscaux/sociaux sont copiés du composant.
       */
      await client.query(
        `
        INSERT INTO payroll_slip_lines (
          slip_id,
          component_id,
          code,
          designation,
          category,
          quantity,
          base_amount,
          gain,
          deduction,
          employer_amount,
          sort_order,
          origin,
          calculation_mode,
          taxable,
          cnss_subject,
          cnamgs_subject,
          tcs_subject,
          irpp_subject
        )
        VALUES (
          $1,
          $2,
          'SAL_BASE',
          'Salaire de base',
          'earning',
          1,
          $3,
          $3,
          0,
          0,
          1,
          'system',
          'fixed',
          $4,
          $5,
          $6,
          $7,
          $8
        )
        `,
        [
          slipId,
          baseComponent?.id || null,
          baseSalary,
          baseComponent?.taxable || false,
          baseComponent?.cnss_subject || false,
          baseComponent?.cnamgs_subject || false,
          baseComponent?.tcs_subject || false,
          baseComponent?.irpp_subject || false,
        ]
      );

      created++;
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Bulletins préparés.",
      created,
      existing,
      total: created + existing,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur prepareSlips :", error);

    res.status(500).json({
      message: "Erreur lors de la préparation des bulletins.",
    });
  } finally {
    client.release();
  }
};


/**
 * Détail d'un bulletin
 */
const getSlipById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const slipResult = await pool.query(
      `
      SELECT
        s.*,

        e.matricule,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.birth_date,
        e.birth_place,
        e.nationality,
        e.marital_status,
        e.children_count,
        e.cnss_number,
        e.position,
        e.hire_date,
        e.photo_url,

        c.name AS company_name,
        c.legal_name AS company_legal_name,
        c.nif AS company_nif,
        c.rccm AS company_rccm,
        c.cnss AS company_cnss,
        c.phone AS company_phone,
        c.email AS company_email,
        c.address AS company_address,
        c.logo_url AS company_logo

      FROM payroll_slips s

      INNER JOIN employees e
        ON e.id = s.employee_id

      INNER JOIN companies c
        ON c.id = s.company_id

      WHERE s.id = $1
        AND s.company_id = $2
      `,
      [id, companyId]
    );

    if (slipResult.rowCount === 0) {
      return res.status(404).json({
        message: "Bulletin introuvable.",
      });
    }

    /*
     * Récupérer les lignes du bulletin
     */
    const linesResult = await pool.query(
      `
      SELECT
        l.*,
        pc.name AS component_name

      FROM payroll_slip_lines l

      LEFT JOIN payroll_components pc
        ON pc.id = l.component_id

      WHERE l.slip_id = $1

      ORDER BY
        l.category,
        l.sort_order,
        l.designation
      `,
      [id]
    );

    res.json({
      slip: slipResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error("Erreur getSlipById :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération du bulletin.",
    });
  }
};


/**
 * Modifier les informations générales du bulletin
 */
const updateSlip = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      worked_days,
      paid_days,
      absence_days,
      overtime_hours,
      payment_method,
      payment_reference,
      notes,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE payroll_slips
      SET
        worked_days = $1,
        paid_days = $2,
        absence_days = $3,
        overtime_hours = $4,
        payment_method = $5,
        payment_reference = $6,
        notes = $7,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $8
        AND company_id = $9
        AND status = 'draft'

      RETURNING *
      `,
      [
        worked_days || 0,
        paid_days || 0,
        absence_days || 0,
        overtime_hours || 0,
        payment_method || null,
        payment_reference || null,
        notes || null,
        id,
        companyId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        message:
          "Bulletin introuvable ou impossible à modifier.",
      });
    }

    res.json({
      message: "Bulletin mis à jour.",
      slip: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateSlip :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du bulletin.",
    });
  }
};


/**
 * Lancer le calcul d'un bulletin
 */
const calculateSlipTaxes = async (req, res) => {
  const client = await pool.connect();

  try {
    const { companyId } = req.user;
    const { id } = req.params;

    await client.query("BEGIN");

    const totals = await calculateSlip({
      client,
      slipId: id,
      companyId,
    });

    await client.query("COMMIT");

    return res.json({
      message: "Bulletin calculé avec succès.",
      totals,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur calcul bulletin :", error);

    if (error.message === "SLIP_NOT_FOUND") {
      return res.status(404).json({
        message: "Bulletin introuvable.",
      });
    }

    if (error.message === "SLIP_NOT_EDITABLE") {
      return res.status(400).json({
        message: "Ce bulletin n'est plus modifiable.",
      });
    }

    if (error.message === "PAYROLL_SETTINGS_NOT_FOUND") {
      return res.status(400).json({
        message:
          "Les paramètres de paie de l'entreprise ne sont pas configurés.",
      });
    }

    return res.status(500).json({
      message: "Erreur lors du calcul du bulletin.",
    });
  } finally {
    client.release();
  }
};


module.exports = {
  getSlipStats,
  getSlips,
  prepareSlips,
  getSlipById,
  updateSlip,
  calculateSlipTaxes,
};