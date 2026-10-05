const pool = require("../../config/db");

/**
 * Statistiques des rubriques
 */
const getComponentStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE is_active = TRUE
        )::int AS active,

        COUNT(*) FILTER (
          WHERE is_active = FALSE
        )::int AS inactive,

        COUNT(*) FILTER (
          WHERE category = 'earning'
        )::int AS earnings,

        COUNT(*) FILTER (
          WHERE category = 'deduction'
        )::int AS deductions,

        COUNT(*) FILTER (
          WHERE category = 'tax'
        )::int AS taxes,

        COUNT(*) FILTER (
          WHERE category = 'employer_contribution'
        )::int AS employer_contributions

      FROM payroll_components
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getComponentStats :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des statistiques.",
    });
  }
};

/**
 * Liste des rubriques
 */
const getComponents = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT *
      FROM payroll_components
      WHERE company_id = $1
      ORDER BY sort_order ASC, name ASC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getComponents :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des rubriques.",
    });
  }
};

/**
 * Une rubrique
 */
const getComponentById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM payroll_components
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Rubrique de paie introuvable.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getComponentById :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération de la rubrique.",
    });
  }
};

/**
 * Créer une rubrique
 */
const createComponent = async (req, res) => {
  try {
    const { companyId } = req.user;

    const {
      code,
      name,
      category,
      calculation_method,
      base_code,
      rate,
      fixed_amount,
      ceiling_amount,
      floor_amount,
      taxable,
      cnss_subject,
      cnamgs_subject,
      tcs_subject,
      irpp_subject,
      is_active,
      sort_order,
    } = req.body;

    if (!code || !name || !category) {
      return res.status(400).json({
        message: "Le code, le nom et la catégorie sont obligatoires.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO payroll_components (
        company_id,
        code,
        name,
        category,
        calculation_method,
        base_code,
        rate,
        fixed_amount,
        ceiling_amount,
        floor_amount,
        taxable,
        cnss_subject,
        cnamgs_subject,
        tcs_subject,
        irpp_subject,
        is_active,
        sort_order
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17
      )
      RETURNING *
      `,
      [
        companyId,
        code.trim().toUpperCase(),
        name.trim(),
        category,
        calculation_method || "manual",
        base_code || null,
        rate || null,
        fixed_amount || null,
        ceiling_amount || null,
        floor_amount || null,
        taxable === true,
        cnss_subject === true,
        cnamgs_subject === true,
        tcs_subject === true,
        irpp_subject === true,
        is_active !== false,
        sort_order || 0,
      ]
    );

    res.status(201).json({
      message: "Rubrique de paie créée.",
      component: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur createComponent :", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Une rubrique avec ce code existe déjà.",
      });
    }

    res.status(500).json({
      message: "Erreur lors de la création de la rubrique.",
    });
  }
};

/**
 * Modifier une rubrique
 */
const updateComponent = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      code,
      name,
      category,
      calculation_method,
      base_code,
      rate,
      fixed_amount,
      ceiling_amount,
      floor_amount,
      taxable,
      cnss_subject,
      cnamgs_subject,
      tcs_subject,
      irpp_subject,
      is_active,
      sort_order,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE payroll_components
      SET
        code = $1,
        name = $2,
        category = $3,
        calculation_method = $4,
        base_code = $5,
        rate = $6,
        fixed_amount = $7,
        ceiling_amount = $8,
        floor_amount = $9,
        taxable = $10,
        cnss_subject = $11,
        cnamgs_subject = $12,
        tcs_subject = $13,
        irpp_subject = $14,
        is_active = $15,
        sort_order = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
        AND company_id = $18
      RETURNING *
      `,
      [
        code.trim().toUpperCase(),
        name.trim(),
        category,
        calculation_method || "manual",
        base_code || null,
        rate || null,
        fixed_amount || null,
        ceiling_amount || null,
        floor_amount || null,
        taxable === true,
        cnss_subject === true,
        cnamgs_subject === true,
        tcs_subject === true,
        irpp_subject === true,
        is_active !== false,
        sort_order || 0,
        id,
        companyId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Rubrique de paie introuvable.",
      });
    }

    res.json({
      message: "Rubrique de paie mise à jour.",
      component: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateComponent :", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Une rubrique avec ce code existe déjà.",
      });
    }

    res.status(500).json({
      message: "Erreur lors de la modification de la rubrique.",
    });
  }
};

/**
 * Activer / désactiver
 */
const toggleComponent = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE payroll_components
      SET
        is_active = NOT is_active,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND company_id = $2
      RETURNING *
      `,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Rubrique de paie introuvable.",
      });
    }

    res.json({
      message: "Statut de la rubrique mis à jour.",
      component: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur toggleComponent :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du statut.",
    });
  }
};

/**
 * Supprimer
 */
const deleteComponent = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM payroll_components
      WHERE id = $1
        AND company_id = $2
      RETURNING id
      `,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Rubrique de paie introuvable.",
      });
    }

    res.json({
      message: "Rubrique supprimée.",
    });
  } catch (error) {
    console.error("Erreur deleteComponent :", error);

    res.status(500).json({
      message:
        "Impossible de supprimer cette rubrique. Elle peut être utilisée dans des bulletins existants.",
    });
  }
};

module.exports = {
  getComponentStats,
  getComponents,
  getComponentById,
  createComponent,
  updateComponent,
  toggleComponent,
  deleteComponent,
};