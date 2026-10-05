const pool = require("../../config/db");

/**
 * PATCH /payroll/components/:id/status
 * Body : { is_active: boolean }
 */
const updateComponentStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                message: "is_active doit être un booléen.",
            });
        }

        const current = await pool.query(
            `
            SELECT id, code, category, special_code
            FROM payroll_components
            WHERE id = $1
              AND company_id = $2
            `,
            [req.params.id, req.user.companyId]
        );

        if (current.rowCount === 0) {
            return res.status(404).json({
                message: "Composant introuvable.",
            });
        }

        const component = current.rows[0];

        /*
         * Le salaire de base est indispensable au calcul des bulletins.
         */
        if (!is_active && component.special_code === "SALARY_BASE") {
            return res.status(400).json({
                message:
                    "Le salaire de base ne peut pas être désactivé.",
            });
        }

        const result = await pool.query(
            `
            UPDATE payroll_components
            SET
                is_active = $1,
                updated_at = NOW()
            WHERE id = $2
              AND company_id = $3
            RETURNING *
            `,
            [is_active, req.params.id, req.user.companyId]
        );

        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Erreur statut composant :", error);

        return res.status(500).json({
            message: "Erreur lors du changement de statut.",
        });
    }
};

/**
 * PATCH /payroll/rules/:id/status
 * Body : { is_active: boolean }
 */
const updateRuleStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                message: "is_active doit être un booléen.",
            });
        }

        const result = await pool.query(
            `
            UPDATE payroll_rules
            SET
                is_active = $1,
                updated_at = NOW()
            WHERE id = $2
              AND company_id = $3
            RETURNING *
            `,
            [is_active, req.params.id, req.user.companyId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Règle introuvable.",
            });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Erreur statut règle :", error);

        return res.status(500).json({
            message: "Erreur lors du changement de statut.",
        });
    }
};

module.exports = {
    updateComponentStatus,
    updateRuleStatus,
};