const pool = require("../../config/db");

/**
 * Liste des règles de paie
 */
const getRules = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT
        r.*,
        pc.name AS component_name,
        pc.category AS component_category,
        (
          SELECT COUNT(*)
          FROM payroll_tax_brackets b
          WHERE b.rule_id = r.id
        ) AS brackets_count
      FROM payroll_rules r
      LEFT JOIN payroll_components pc
        ON pc.id = r.component_id
      WHERE r.company_id = $1
      ORDER BY r.rule_type, r.name, r.effective_from DESC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getRules :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération des règles de paie.",
    });
  }
};

/**
 * Détail d'une règle + tranches
 */
const getRuleById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const ruleResult = await pool.query(
      `
      SELECT
        r.*,
        pc.name AS component_name,
        pc.category AS component_category
      FROM payroll_rules r
      LEFT JOIN payroll_components pc
        ON pc.id = r.component_id
      WHERE r.id = $1
        AND r.company_id = $2
      `,
      [id, companyId]
    );

    if (ruleResult.rowCount === 0) {
      return res.status(404).json({
        message: "Règle de paie introuvable.",
      });
    }

    const bracketsResult = await pool.query(
      `
      SELECT *
      FROM payroll_tax_brackets
      WHERE rule_id = $1
      ORDER BY sort_order, minimum_amount
      `,
      [id]
    );

    res.json({
      ...ruleResult.rows[0],
      brackets: bracketsResult.rows,
    });
  } catch (error) {
    console.error("Erreur getRuleById :", error);

    res.status(500).json({
      message: "Erreur lors de la récupération de la règle.",
    });
  }
};

/**
 * Créer une règle
 */
const createRule = async (req, res) => {
  try {
    const { companyId } = req.user;

    const {
      component_id,
      code,
      name,
      rule_type,
      calculation_method,
      employee_rate,
      employer_rate,
      ceiling_amount,
      floor_amount,
      exemption_amount,
      annual_exemption_amount,
      base_type,
      effective_from,
      effective_to,
      description,
    } = req.body;

    if (!code || !name || !rule_type || !effective_from) {
      return res.status(400).json({
        message: "Code, nom, type et date d'effet sont obligatoires.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO payroll_rules (
        company_id,
        component_id,
        code,
        name,
        rule_type,
        calculation_method,
        employee_rate,
        employer_rate,
        ceiling_amount,
        floor_amount,
        exemption_amount,
        annual_exemption_amount,
        base_type,
        effective_from,
        effective_to,
        description
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16
      )
      RETURNING *
      `,
      [
        companyId,
        component_id || null,
        code,
        name,
        rule_type,
        calculation_method || "percentage",
        employee_rate || 0,
        employer_rate || 0,
        ceiling_amount || null,
        floor_amount || null,
        exemption_amount || 0,
        annual_exemption_amount || 0,
        base_type || null,
        effective_from,
        effective_to || null,
        description || null,
      ]
    );

    res.status(201).json({
      message: "Règle de paie créée.",
      rule: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur createRule :", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Une règle avec ce code existe déjà pour cette date d'effet.",
      });
    }

    res.status(500).json({
      message: "Erreur lors de la création de la règle.",
    });
  }
};

/**
 * Modifier une règle
 */
const updateRule = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      component_id,
      code,
      name,
      rule_type,
      calculation_method,
      employee_rate,
      employer_rate,
      ceiling_amount,
      floor_amount,
      exemption_amount,
      annual_exemption_amount,
      base_type,
      effective_from,
      effective_to,
      description,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE payroll_rules
      SET
        component_id = $1,
        code = $2,
        name = $3,
        rule_type = $4,
        calculation_method = $5,
        employee_rate = $6,
        employer_rate = $7,
        ceiling_amount = $8,
        floor_amount = $9,
        exemption_amount = $10,
        annual_exemption_amount = $11,
        base_type = $12,
        effective_from = $13,
        effective_to = $14,
        description = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
        AND company_id = $17
      RETURNING *
      `,
      [
        component_id || null,
        code,
        name,
        rule_type,
        calculation_method || "percentage",
        employee_rate || 0,
        employer_rate || 0,
        ceiling_amount || null,
        floor_amount || null,
        exemption_amount || 0,
        annual_exemption_amount || 0,
        base_type || null,
        effective_from,
        effective_to || null,
        description || null,
        id,
        companyId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Règle de paie introuvable.",
      });
    }

    res.json({
      message: "Règle de paie mise à jour.",
      rule: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateRule :", error);

    res.status(500).json({
      message: "Erreur lors de la modification de la règle.",
    });
  }
};

/**
 * Activer / désactiver une règle
 */
const toggleRule = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE payroll_rules
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
        message: "Règle de paie introuvable.",
      });
    }

    res.json({
      message: "Statut de la règle mis à jour.",
      rule: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur toggleRule :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du statut.",
    });
  }
};

/**
 * Supprimer une règle
 */
const deleteRule = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM payroll_rules
      WHERE id = $1
        AND company_id = $2
      RETURNING id
      `,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Règle de paie introuvable.",
      });
    }

    res.json({
      message: "Règle de paie supprimée.",
    });
  } catch (error) {
    console.error("Erreur deleteRule :", error);

    res.status(500).json({
      message: "Erreur lors de la suppression de la règle.",
    });
  }
};

module.exports = {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
};