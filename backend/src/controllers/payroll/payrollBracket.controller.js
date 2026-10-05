const pool = require("../../config/db");


/**
 * Vérifier que la règle appartient à l'entreprise
 */
const getRule = async (client, ruleId, companyId) => {

    const result = await client.query(
        `
        SELECT *
        FROM payroll_rules
        WHERE id = $1
          AND company_id = $2
        `,
        [
            ruleId,
            companyId
        ]
    );

    if (result.rowCount === 0) {
        throw new Error("RULE_NOT_FOUND");
    }

    return result.rows[0];
};


/**
 * Liste des tranches d'une règle
 */
const getBrackets = async (req, res) => {

    try {

        const {
            ruleId
        } = req.params;

        const ruleResult = await pool.query(
            `
            SELECT *
            FROM payroll_rules
            WHERE id = $1
              AND company_id = $2
            `,
            [
                ruleId,
                req.user.companyId
            ]
        );

        if (ruleResult.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Règle de paie introuvable."
            });
        }

        const result = await pool.query(
            `
            SELECT *
            FROM payroll_tax_brackets
            WHERE rule_id = $1
            ORDER BY
                minimum_amount ASC,
                sort_order ASC
            `,
            [ruleId]
        );

        return res.json({
            rule: ruleResult.rows[0],
            brackets: result.rows
        });

    } catch (error) {

        console.error(
            "Erreur récupération tranches :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la récupération des tranches."
        });
    }
};


/**
 * Ajouter une tranche
 */
const createBracket = async (req, res) => {

    try {

        const {
            ruleId
        } = req.params;

        const {
            minimum_amount,
            maximum_amount,
            rate,
            fixed_amount = 0,
            sort_order = 0,
            effective_from = null,
            effective_to = null
        } = req.body;


        if (
            minimum_amount === undefined ||
            minimum_amount === null
        ) {
            return res.status(400).json({
                message:
                    "Le minimum de la tranche est obligatoire."
            });
        }


        if (rate === undefined || rate === null) {
            return res.status(400).json({
                message:
                    "Le taux de la tranche est obligatoire."
            });
        }


        const ruleResult = await pool.query(
            `
            SELECT *
            FROM payroll_rules
            WHERE id = $1
              AND company_id = $2
            `,
            [
                ruleId,
                req.user.companyId
            ]
        );


        if (ruleResult.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Règle de paie introuvable."
            });
        }


        if (
            ruleResult.rows[0].calculation_method !==
            "progressive"
        ) {

            return res.status(400).json({
                message:
                    "Cette règle n'utilise pas de calcul progressif."
            });
        }


        const result = await pool.query(
            `
            INSERT INTO payroll_tax_brackets (
                rule_id,
                minimum_amount,
                maximum_amount,
                rate,
                fixed_amount,
                sort_order,
                effective_from,
                effective_to
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                COALESCE($7, CURRENT_DATE),
                $8
            )
            RETURNING *
            `,
            [
                ruleId,
                Number(minimum_amount),
                maximum_amount === "" ||
                maximum_amount === undefined
                    ? null
                    : Number(maximum_amount),
                Number(rate),
                Number(fixed_amount || 0),
                Number(sort_order || 0),
                effective_from,
                effective_to
            ]
        );


        return res.status(201).json({
            message:
                "Tranche ajoutée avec succès.",
            bracket:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Erreur création tranche :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la création de la tranche."
        });
    }
};


/**
 * Modifier une tranche
 */
const updateBracket = async (req, res) => {

    try {

        const {
            ruleId,
            bracketId
        } = req.params;

        const {
            minimum_amount,
            maximum_amount,
            rate,
            fixed_amount,
            sort_order,
            effective_from,
            effective_to
        } = req.body;


        const result = await pool.query(
            `
            UPDATE payroll_tax_brackets b
            SET
                minimum_amount =
                    COALESCE($1, minimum_amount),

                maximum_amount =
                    CASE
                        WHEN $2::TEXT = ''
                            THEN NULL
                        ELSE COALESCE(
                            $2::NUMERIC,
                            maximum_amount
                        )
                    END,

                rate =
                    COALESCE($3, rate),

                fixed_amount =
                    COALESCE($4, fixed_amount),

                sort_order =
                    COALESCE($5, sort_order),

                effective_from =
                    COALESCE(
                        $6,
                        effective_from
                    ),

                effective_to =
                    $7

            FROM payroll_rules r

            WHERE b.id = $8
              AND b.rule_id = r.id
              AND r.id = $9
              AND r.company_id = $10

            RETURNING b.*
            `,
            [
                minimum_amount !== undefined
                    ? Number(minimum_amount)
                    : null,

                maximum_amount !== undefined
                    ? String(maximum_amount)
                    : null,

                rate !== undefined
                    ? Number(rate)
                    : null,

                fixed_amount !== undefined
                    ? Number(fixed_amount)
                    : null,

                sort_order !== undefined
                    ? Number(sort_order)
                    : null,

                effective_from || null,

                effective_to || null,

                bracketId,
                ruleId,
                req.user.companyId
            ]
        );


        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Tranche introuvable."
            });
        }


        return res.json({
            message:
                "Tranche modifiée avec succès.",
            bracket:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Erreur modification tranche :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la modification de la tranche."
        });
    }
};


/**
 * Supprimer une tranche
 */
const deleteBracket = async (req, res) => {

    try {

        const {
            ruleId,
            bracketId
        } = req.params;

        const result = await pool.query(
            `
            DELETE FROM payroll_tax_brackets b
            USING payroll_rules r
            WHERE b.id = $1
              AND b.rule_id = $2
              AND r.id = b.rule_id
              AND r.company_id = $3
            RETURNING b.*
            `,
            [
                bracketId,
                ruleId,
                req.user.companyId
            ]
        );


        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Tranche introuvable."
            });
        }


        return res.json({
            message:
                "Tranche supprimée avec succès."
        });

    } catch (error) {

        console.error(
            "Erreur suppression tranche :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la suppression de la tranche."
        });
    }
};


module.exports = {
    getBrackets,
    createBracket,
    updateBracket,
    deleteBracket
};