const pool = require("../../config/db");

/**
 * Vérifie que le bulletin existe et qu'il peut encore être modifié.
 */
const getEditableSlip = async (client, slipId, companyId) => {
    const result = await client.query(
        `
        SELECT
            s.*,
            p.status AS period_status
        FROM payroll_slips s
        INNER JOIN payroll_periods p
            ON p.id = s.period_id
        WHERE s.id = $1
          AND s.company_id = $2
        `,
        [slipId, companyId]
    );

    if (result.rowCount === 0) {
        throw new Error("SLIP_NOT_FOUND");
    }

    const slip = result.rows[0];

    if (
        slip.status !== "draft" ||
        slip.period_status !== "draft"
    ) {
        throw new Error("SLIP_NOT_EDITABLE");
    }

    return slip;
};


/**
 * Recalcule les totaux du bulletin
 * à partir de ses lignes.
 *
 * Aucune présence n'est utilisée ici.
 */
const recalculateSlipTotals = async (client, slipId) => {

    const result = await client.query(
        `
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN category = 'earning'
                        THEN gain
                        ELSE 0
                    END
                ),
                0
            ) AS gross_salary,

            COALESCE(
                SUM(
                    CASE
                        WHEN category IN ('deduction', 'tax')
                        THEN deduction
                        ELSE 0
                    END
                ),
                0
            ) AS employee_deductions,

            COALESCE(
                SUM(employer_amount),
                0
            ) AS employer_contributions

        FROM payroll_slip_lines
        WHERE slip_id = $1
        `,
        [slipId]
    );

    const totals = result.rows[0];

    const grossSalary = Number(totals.gross_salary || 0);
    const employeeDeductions =
        Number(totals.employee_deductions || 0);

    const employerContributions =
        Number(totals.employer_contributions || 0);

    const netSalary =
        grossSalary - employeeDeductions;

    await client.query(
        `
        UPDATE payroll_slips
        SET
            gross_salary = $1,
            employee_deductions = $2,
            employer_contributions = $3,
            net_salary = $4,
            net_to_pay = $4,
            updated_at = NOW()
        WHERE id = $5
        `,
        [
            grossSalary,
            employeeDeductions,
            employerContributions,
            netSalary,
            slipId
        ]
    );

    return {
        gross_salary: grossSalary,
        employee_deductions: employeeDeductions,
        employer_contributions: employerContributions,
        net_salary: netSalary,
        net_to_pay: netSalary
    };
};


/**
 * Liste des lignes d'un bulletin
 */
const getLines = async (req, res) => {

    try {

        const { slipId } = req.params;

        const result = await pool.query(
            `
            SELECT
                l.*,
                pc.name AS component_name,
                pc.special_code AS component_special_code
            FROM payroll_slip_lines l
            LEFT JOIN payroll_components pc
                ON pc.id = l.component_id
            INNER JOIN payroll_slips s
                ON s.id = l.slip_id
            WHERE l.slip_id = $1
              AND s.company_id = $2
            ORDER BY
                l.sort_order ASC,
                l.created_at ASC
            `,
            [slipId, req.user.companyId]
        );

        return res.json(result.rows);

    } catch (error) {

        console.error(
            "Erreur récupération lignes bulletin :",
            error
        );

        return res.status(500).json({
            message: "Erreur lors de la récupération des lignes."
        });
    }
};


/**
 * Ajouter une ligne manuelle
 */
const createLine = async (req, res) => {

    const client = await pool.connect();

    try {

        const { slipId } = req.params;

        const {
            component_id,
            code,
            designation,
            category,
            quantity = 1,
            base_amount = 0,
            rate = null,
            gain = 0,
            deduction = 0,
            employer_amount = 0,
            calculation_mode = "manual",
            notes = null
        } = req.body;

        if (!designation) {
            return res.status(400).json({
                message: "La désignation est obligatoire."
            });
        }

        if (!category) {
            return res.status(400).json({
                message: "La catégorie est obligatoire."
            });
        }

        if (!["earning", "deduction", "information"].includes(category)) {
            return res.status(400).json({
                message:
                    "Cette catégorie ne peut pas être ajoutée manuellement."
            });
        }

        await client.query("BEGIN");

        await getEditableSlip(
            client,
            slipId,
            req.user.companyId
        );

        /*
         * Récupération du composant de paie.
         * Ses paramètres sont copiés (figés) sur la ligne :
         * si le composant change plus tard, les anciens
         * bulletins gardent les règles d'origine.
         */
        let component = null;

        if (component_id) {

            const componentResult = await client.query(
                `
                SELECT
                    id,
                    company_id,
                    code,
                    name,
                    category,
                    taxable,
                    cnss_subject,
                    cnamgs_subject,
                    tcs_subject,
                    irpp_subject
                FROM payroll_components
                WHERE id = $1
                  AND company_id = $2
                  AND is_active = TRUE
                LIMIT 1
                `,
                [
                    component_id,
                    req.user.companyId
                ]
            );

            if (componentResult.rowCount === 0) {
                throw new Error("COMPONENT_NOT_FOUND");
            }

            component = componentResult.rows[0];
        }

        let finalGain = Number(gain || 0);
        let finalDeduction = Number(deduction || 0);

        const qty = Number(quantity || 0);
        const base = Number(base_amount || 0);
        const numericRate =
            rate === null || rate === ""
                ? null
                : Number(rate);

        /*
         * Calcul quantité × base × taux %
         */
        if (
            calculation_mode === "quantity_rate" &&
            numericRate !== null
        ) {
            const amount =
                qty * base * numericRate / 100;

            if (category === "earning") {
                finalGain = amount;
            }

            if (category === "deduction") {
                finalDeduction = amount;
            }
        }

        /*
         * Mode jours
         *
         * Exemple :
         * salaire 150 000
         * 3 jours
         * base mensuelle 30 jours
         *
         * 3 × 150 000 / 30 = 15 000
         */
        if (calculation_mode === "days") {

            const settingsResult = await client.query(
                `
                SELECT monthly_work_days
                FROM payroll_settings
                WHERE company_id = $1
                `,
                [req.user.companyId]
            );

            const monthlyDays =
                Number(
                    settingsResult.rows[0]?.monthly_work_days ||
                    30
                );

            const amount =
                qty * base / monthlyDays;

            if (category === "deduction") {
                finalDeduction = amount;
            }

            if (category === "earning") {
                finalGain = amount;
            }
        }

        const maxSortResult = await client.query(
            `
            SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
            FROM payroll_slip_lines
            WHERE slip_id = $1
            `,
            [slipId]
        );

        const sortOrder =
            Number(maxSortResult.rows[0].next_sort);

        const result = await client.query(
            `
            INSERT INTO payroll_slip_lines (
                slip_id,
                component_id,
                code,
                designation,
                category,
                quantity,
                base_amount,
                rate,
                gain,
                deduction,
                employer_amount,
                sort_order,
                origin,
                calculation_mode,
                notes,
                taxable,
                cnss_subject,
                cnamgs_subject,
                tcs_subject,
                irpp_subject
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, 'manual', $13, $14,
                $15, $16, $17, $18, $19
            )
            RETURNING *
            `,
            [
                slipId,
                component_id || null,
                code ||
                    component?.code ||
                    "CUSTOM",
                designation,
                category,
                qty,
                base,
                numericRate,
                finalGain,
                finalDeduction,
                Number(employer_amount || 0),
                sortOrder,
                calculation_mode,
                notes,
                component?.taxable || false,
                component?.cnss_subject || false,
                component?.cnamgs_subject || false,
                component?.tcs_subject || false,
                component?.irpp_subject || false
            ]
        );

        const totals = await recalculateSlipTotals(
            client,
            slipId
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Ligne ajoutée avec succès.",
            line: result.rows[0],
            totals
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Erreur ajout ligne bulletin :",
            error
        );

        if (error.message === "SLIP_NOT_FOUND") {
            return res.status(404).json({
                message: "Bulletin introuvable."
            });
        }

        if (error.message === "SLIP_NOT_EDITABLE") {
            return res.status(400).json({
                message:
                    "Ce bulletin n'est plus modifiable."
            });
        }

        if (error.message === "COMPONENT_NOT_FOUND") {
            return res.status(400).json({
                message:
                    "Composant de paie introuvable ou inactif."
            });
        }

        return res.status(500).json({
            message: "Erreur lors de l'ajout de la ligne."
        });

    } finally {

        client.release();
    }
};


/**
 * Modifier une ligne
 */
const updateLine = async (req, res) => {

    const client = await pool.connect();

    try {

        const { slipId, lineId } = req.params;

        const {
            designation,
            quantity,
            base_amount,
            rate,
            gain,
            deduction,
            employer_amount,
            calculation_mode,
            notes
        } = req.body;

        await client.query("BEGIN");

        await getEditableSlip(
            client,
            slipId,
            req.user.companyId
        );

        const existingResult = await client.query(
            `
            SELECT *
            FROM payroll_slip_lines
            WHERE id = $1
              AND slip_id = $2
            `,
            [lineId, slipId]
        );

        if (existingResult.rowCount === 0) {
            throw new Error("LINE_NOT_FOUND");
        }

        const existing = existingResult.rows[0];

        let finalGain =
            gain !== undefined
                ? Number(gain || 0)
                : Number(existing.gain || 0);

        let finalDeduction =
            deduction !== undefined
                ? Number(deduction || 0)
                : Number(existing.deduction || 0);

        const finalQuantity =
            quantity !== undefined
                ? Number(quantity || 0)
                : Number(existing.quantity || 0);

        const finalBase =
            base_amount !== undefined
                ? Number(base_amount || 0)
                : Number(existing.base_amount || 0);

        const finalRate =
            rate !== undefined &&
            rate !== null &&
            rate !== ""
                ? Number(rate)
                : existing.rate;

        const finalMode =
            calculation_mode ||
            existing.calculation_mode ||
            "manual";

        /*
         * Recalculer si nécessaire
         */
        if (
            finalMode === "quantity_rate" &&
            finalRate !== null
        ) {

            const amount =
                finalQuantity *
                finalBase *
                Number(finalRate) /
                100;

            if (existing.category === "earning") {
                finalGain = amount;
            }

            if (existing.category === "deduction") {
                finalDeduction = amount;
            }
        }

        if (finalMode === "days") {

            const settingsResult = await client.query(
                `
                SELECT monthly_work_days
                FROM payroll_settings
                WHERE company_id = $1
                `,
                [req.user.companyId]
            );

            const monthlyDays =
                Number(
                    settingsResult.rows[0]?.monthly_work_days ||
                    30
                );

            const amount =
                finalQuantity *
                finalBase /
                monthlyDays;

            if (existing.category === "deduction") {
                finalDeduction = amount;
            }

            if (existing.category === "earning") {
                finalGain = amount;
            }
        }

        const result = await client.query(
            `
            UPDATE payroll_slip_lines
            SET
                designation = COALESCE($1, designation),
                quantity = $2,
                base_amount = $3,
                rate = $4,
                gain = $5,
                deduction = $6,
                employer_amount = $7,
                calculation_mode = $8,
                notes = $9
            WHERE id = $10
              AND slip_id = $11
            RETURNING *
            `,
            [
                designation || null,
                finalQuantity,
                finalBase,
                finalRate,
                finalGain,
                finalDeduction,
                employer_amount !== undefined
                    ? Number(employer_amount || 0)
                    : Number(existing.employer_amount || 0),
                finalMode,
                notes !== undefined
                    ? notes
                    : existing.notes,
                lineId,
                slipId
            ]
        );

        /*
         * Si on modifie le salaire de base,
         * on synchronise aussi payroll_slips.base_salary.
         */
        if (existing.code === "SAL_BASE") {

            await client.query(
                `
                UPDATE payroll_slips
                SET
                    base_salary = $1,
                    updated_at = NOW()
                WHERE id = $2
                `,
                [
                    finalGain,
                    slipId
                ]
            );
        }

        const totals = await recalculateSlipTotals(
            client,
            slipId
        );

        await client.query("COMMIT");

        return res.json({
            message: "Ligne modifiée avec succès.",
            line: result.rows[0],
            totals
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Erreur modification ligne bulletin :",
            error
        );

        if (error.message === "SLIP_NOT_FOUND") {
            return res.status(404).json({
                message: "Bulletin introuvable."
            });
        }

        if (error.message === "SLIP_NOT_EDITABLE") {
            return res.status(400).json({
                message:
                    "Ce bulletin n'est plus modifiable."
            });
        }

        if (error.message === "LINE_NOT_FOUND") {
            return res.status(404).json({
                message: "Ligne introuvable."
            });
        }

        return res.status(500).json({
            message:
                "Erreur lors de la modification de la ligne."
        });

    } finally {

        client.release();
    }
};


/**
 * Supprimer une ligne
 */
const deleteLine = async (req, res) => {

    const client = await pool.connect();

    try {

        const { slipId, lineId } = req.params;

        await client.query("BEGIN");

        await getEditableSlip(
            client,
            slipId,
            req.user.companyId
        );

        const result = await client.query(
            `
            DELETE FROM payroll_slip_lines l
            USING payroll_slips s
            WHERE l.id = $1
              AND l.slip_id = $2
              AND s.id = l.slip_id
              AND s.company_id = $3
            RETURNING l.*
            `,
            [
                lineId,
                slipId,
                req.user.companyId
            ]
        );

        if (result.rowCount === 0) {
            throw new Error("LINE_NOT_FOUND");
        }

        /*
         * Si le salaire de base est supprimé,
         * on remet base_salary à 0.
         */
        if (result.rows[0].code === "SAL_BASE") {

            await client.query(
                `
                UPDATE payroll_slips
                SET
                    base_salary = 0,
                    updated_at = NOW()
                WHERE id = $1
                `,
                [slipId]
            );
        }

        const totals = await recalculateSlipTotals(
            client,
            slipId
        );

        await client.query("COMMIT");

        return res.json({
            message: "Ligne supprimée avec succès.",
            totals
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Erreur suppression ligne bulletin :",
            error
        );

        if (error.message === "SLIP_NOT_FOUND") {
            return res.status(404).json({
                message: "Bulletin introuvable."
            });
        }

        if (error.message === "SLIP_NOT_EDITABLE") {
            return res.status(400).json({
                message:
                    "Ce bulletin n'est plus modifiable."
            });
        }

        if (error.message === "LINE_NOT_FOUND") {
            return res.status(404).json({
                message: "Ligne introuvable."
            });
        }

        return res.status(500).json({
            message:
                "Erreur lors de la suppression de la ligne."
        });

    } finally {

        client.release();
    }
};


module.exports = {
    getLines,
    createLine,
    updateLine,
    deleteLine
};