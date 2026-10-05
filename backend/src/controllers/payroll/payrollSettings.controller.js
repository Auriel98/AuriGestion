const pool = require("../../config/db");

const {
    initializePayroll
} = require("../../service/payroll/payrollInitialization.service");


/**
 * Récupérer les paramètres généraux
 */
const getSettings = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM payroll_settings
            WHERE company_id = $1
            `,
            [req.user.companyId]
        );

        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Les paramètres de paie ne sont pas encore configurés."
            });
        }

        return res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Erreur récupération paramètres paie :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la récupération des paramètres."
        });
    }
};


/**
 * Modifier les paramètres généraux
 */
const updateSettings = async (req, res) => {

    try {

        const {
            currency,
            monthly_work_days,
            monthly_work_hours,
            rounding_decimals
        } = req.body;

        const result = await pool.query(
            `
            UPDATE payroll_settings
            SET
                currency = COALESCE($1, currency),
                monthly_work_days =
                    COALESCE($2, monthly_work_days),
                monthly_work_hours =
                    COALESCE($3, monthly_work_hours),
                rounding_decimals =
                    COALESCE($4, rounding_decimals),
                updated_at = NOW()
            WHERE company_id = $5
            RETURNING *
            `,
            [
                currency,
                monthly_work_days,
                monthly_work_hours,
                rounding_decimals,
                req.user.companyId
            ]
        );

        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Paramètres de paie introuvables."
            });
        }

        return res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Erreur modification paramètres paie :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la modification des paramètres."
        });
    }
};


/**
 * Initialiser toute la configuration de paie
 */
const initialize = async (req, res) => {

    try {

        const result =
            await initializePayroll(
                req.user.companyId
            );

        return res.status(201).json(result);

    } catch (error) {

        console.error(
            "Erreur initialisation paie :",
            error
        );

        return res.status(500).json({
            message:
                process.env.NODE_ENV === "production"
                    ? "Erreur lors de l'initialisation de la paie."
                    : `Erreur lors de l'initialisation de la paie : ${error.message}`
        });
    }
};


module.exports = {
    getSettings,
    updateSettings,
    initialize
};