const pool = require("../../config/db");

/*
 * ⚠️ Vérifie le chemin et le nom du fichier qui contient calculateSlip.
 */
const { calculateSlip } = require("../../service/payroll/payrollCalculation.service");
/**
 * Seul un bulletin / une période en brouillon reste modifiable.
 * Une fois "calculated" (bouton Calculer), plus de modification.
 */
const EDITABLE_STATUSES = ["draft"];

const MANUAL_CATEGORIES = ["earning", "deduction", "information"];

/* =====================================================
   OUTILS
===================================================== */

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const toRate = (rate) =>
    rate === null || rate === undefined || rate === ""
        ? null
        : Number(rate);

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
        !EDITABLE_STATUSES.includes(slip.status) ||
        !EDITABLE_STATUSES.includes(slip.period_status)
    ) {
        throw new Error("SLIP_NOT_EDITABLE");
    }

    return slip;
};

/**
 * Recalcule le bulletin (brut, cotisations, net) SANS le verrouiller.
 * calculateSlip passe le bulletin en "calculated" : on le remet
 * en "draft" pour pouvoir continuer à ajouter des lignes.
 * Le verrouillage se fait uniquement via le bouton "Calculer".
 */
const recalculateKeepDraft = async (client, slipId, companyId) => {
    const totals = await calculateSlip({ client, slipId, companyId });

    await client.query(
        `
        UPDATE payroll_slips
        SET
            status = 'draft',
            updated_at = NOW()
        WHERE id = $1
          AND company_id = $2
        `,
        [slipId, companyId]
    );

    return totals;
};

/**
 * Récupère un composant de paie actif de l'entreprise.
 */
const getComponent = async (client, componentId, companyId) => {
    if (!componentId) return null;

    const result = await client.query(
        `
        SELECT
            id,
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
        [componentId, companyId]
    );

    if (result.rowCount === 0) {
        throw new Error("COMPONENT_NOT_FOUND");
    }

    return result.rows[0];
};

/**
 * Nombre de jours mensuels (paramètres de paie).
 */
const getMonthlyDays = async (client, companyId) => {
    const result = await client.query(
        `
        SELECT monthly_work_days
        FROM payroll_settings
        WHERE company_id = $1
        `,
        [companyId]
    );

    return Number(result.rows[0]?.monthly_work_days || 30);
};

/**
 * Calcule le montant d'une ligne selon son mode de calcul.
 *
 * manual / fixed : montant de base (x quantité en manual)
 * quantity_rate  : quantité x base x taux %
 * days           : quantité x base / jours du mois
 */
const computeAmount = ({ mode, quantity, base, rate, monthlyDays }) => {
    switch (mode) {
        case "quantity_rate":
            return rate !== null
                ? (quantity * base * rate) / 100
                : quantity * base;

        case "days":
            return (quantity * base) / monthlyDays;

        case "fixed":
            return base;

        case "manual":
        default:
            return quantity * base;
    }
};

/**
 * Répartit le montant dans gain ou deduction selon la catégorie.
 * Si le montant calculé est 0 et que gain / deduction ont été envoyés
 * explicitement (appel API direct), on les respecte.
 */
const splitAmount = ({ category, amount, explicitGain, explicitDeduction }) => {
    let gain = 0;
    let deduction = 0;

    if (category === "earning") {
        gain = amount > 0 ? amount : Number(explicitGain || 0);
    }

    if (category === "deduction") {
        deduction = amount > 0 ? amount : Number(explicitDeduction || 0);
    }

    return { gain: round2(gain), deduction: round2(deduction) };
};

/**
 * Convertit les erreurs métier en réponse HTTP.
 */
const handleError = (res, error, fallbackMessage) => {
    const known = {
        SLIP_NOT_FOUND: [404, "Bulletin introuvable."],
        SLIP_NOT_EDITABLE: [400, "Ce bulletin n'est plus modifiable."],
        LINE_NOT_FOUND: [404, "Ligne introuvable."],
        LINE_AUTOMATIC: [
            400,
            "Cette ligne est automatique : elle est recalculée par le système.",
        ],
        COMPONENT_NOT_FOUND: [
            400,
            "Composant de paie introuvable ou inactif.",
        ],
        PAYROLL_SETTINGS_NOT_FOUND: [
            400,
            "Les paramètres de paie de l'entreprise sont introuvables.",
        ],
    };

    const match = known[error.message];

    if (match) {
        return res.status(match[0]).json({ message: match[1] });
    }

    return res.status(500).json({ message: fallbackMessage });
};

/* =====================================================
   LISTE DES LIGNES
===================================================== */

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
        console.error("Erreur récupération lignes bulletin :", error);

        return res.status(500).json({
            message: "Erreur lors de la récupération des lignes.",
        });
    }
};

/* =====================================================
   AJOUTER UNE LIGNE MANUELLE
===================================================== */

const createLine = async (req, res) => {
    const client = await pool.connect();

    try {
        const { slipId } = req.params;
        const companyId = req.user.companyId;

        const {
            component_id,
            code,
            designation,
            category,
            quantity = 1,
            base_amount = 0,
            rate = null,
            gain,
            deduction,
            employer_amount = 0,
            calculation_mode = "manual",
            notes = null,
        } = req.body;

        if (!designation) {
            return res.status(400).json({
                message: "La désignation est obligatoire.",
            });
        }

        if (!category) {
            return res.status(400).json({
                message: "La catégorie est obligatoire.",
            });
        }

        if (!MANUAL_CATEGORIES.includes(category)) {
            return res.status(400).json({
                message: "Cette catégorie ne peut pas être ajoutée manuellement.",
            });
        }

        await client.query("BEGIN");

        await getEditableSlip(client, slipId, companyId);

        /*
         * Les indicateurs du composant (taxable, cnss_subject...)
         * sont copiés (figés) sur la ligne.
         */
        const component = await getComponent(client, component_id, companyId);

        const monthlyDays = await getMonthlyDays(client, companyId);

        const qty = Number(quantity || 0);
        const base = Number(base_amount || 0);

        const amount = computeAmount({
            mode: calculation_mode,
            quantity: qty,
            base,
            rate: toRate(rate),
            monthlyDays,
        });

        const { gain: finalGain, deduction: finalDeduction } = splitAmount({
            category,
            amount,
            explicitGain: gain,
            explicitDeduction: deduction,
        });

        const maxSortResult = await client.query(
            `
            SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
            FROM payroll_slip_lines
            WHERE slip_id = $1
            `,
            [slipId]
        );

        const sortOrder = Number(maxSortResult.rows[0].next_sort);

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
                component?.id || null,
                code || component?.code || "CUSTOM",
                designation,
                category,
                qty,
                base,
                toRate(rate),
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
                component?.irpp_subject || false,
            ]
        );

        /*
         * Recalcul complet (brut, cotisations, net à payer)
         * mais le bulletin reste en brouillon.
         */
        const totals = await recalculateKeepDraft(client, slipId, companyId);

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Ligne ajoutée avec succès.",
            line: result.rows[0],
            totals,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur ajout ligne bulletin :", error);

        return handleError(res, error, "Erreur lors de l'ajout de la ligne.");
    } finally {
        client.release();
    }
};

/* =====================================================
   MODIFIER UNE LIGNE
===================================================== */

const updateLine = async (req, res) => {
    const client = await pool.connect();

    try {
        const { slipId, lineId } = req.params;
        const companyId = req.user.companyId;

        const {
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
            calculation_mode,
            notes,
        } = req.body;

        await client.query("BEGIN");

        await getEditableSlip(client, slipId, companyId);

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

        /*
         * Les lignes automatiques (taxes, parts patronales) sont
         * recréées à chaque calcul : seule la ligne SAL_BASE
         * peut être modifiée.
         */
        if (existing.origin === "system" && existing.code !== "SAL_BASE") {
            throw new Error("LINE_AUTOMATIC");
        }

        const finalCategory = category || existing.category;

        if (
            existing.origin !== "system" &&
            !MANUAL_CATEGORIES.includes(finalCategory)
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Catégorie invalide pour une ligne manuelle.",
            });
        }

        const finalQuantity =
            quantity !== undefined
                ? Number(quantity || 0)
                : Number(existing.quantity || 0);

        const finalBase =
            base_amount !== undefined
                ? Number(base_amount || 0)
                : Number(existing.base_amount || 0);

        const finalRate =
            rate !== undefined
                ? toRate(rate)
                : toRate(existing.rate);

        const finalMode =
            calculation_mode || existing.calculation_mode || "manual";

        /*
         * Composant : si fourni, on rafraîchit ses indicateurs,
         * sinon on garde ceux de la ligne.
         */
        let finalComponentId = existing.component_id;

        let flags = {
            taxable: existing.taxable || false,
            cnss_subject: existing.cnss_subject || false,
            cnamgs_subject: existing.cnamgs_subject || false,
            tcs_subject: existing.tcs_subject || false,
            irpp_subject: existing.irpp_subject || false,
        };

        if (component_id !== undefined) {
            const component = await getComponent(
                client,
                component_id,
                companyId
            );

            finalComponentId = component?.id || null;

            flags = {
                taxable: component?.taxable || false,
                cnss_subject: component?.cnss_subject || false,
                cnamgs_subject: component?.cnamgs_subject || false,
                tcs_subject: component?.tcs_subject || false,
                irpp_subject: component?.irpp_subject || false,
            };
        }

        const monthlyDays = await getMonthlyDays(client, companyId);

        const amount = computeAmount({
            mode: finalMode,
            quantity: finalQuantity,
            base: finalBase,
            rate: finalRate,
            monthlyDays,
        });

        const { gain: finalGain, deduction: finalDeduction } = splitAmount({
            category: finalCategory,
            amount,
            explicitGain: gain,
            explicitDeduction: deduction,
        });

        const result = await client.query(
            `
            UPDATE payroll_slip_lines
            SET
                component_id = $1,
                code = $2,
                designation = COALESCE($3, designation),
                category = $4,
                quantity = $5,
                base_amount = $6,
                rate = $7,
                gain = $8,
                deduction = $9,
                employer_amount = $10,
                calculation_mode = $11,
                notes = $12,
                taxable = $13,
                cnss_subject = $14,
                cnamgs_subject = $15,
                tcs_subject = $16,
                irpp_subject = $17
            WHERE id = $18
              AND slip_id = $19
            RETURNING *
            `,
            [
                finalComponentId,
                code || existing.code,
                designation || null,
                finalCategory,
                finalQuantity,
                finalBase,
                finalRate,
                finalGain,
                finalDeduction,
                employer_amount !== undefined
                    ? Number(employer_amount || 0)
                    : Number(existing.employer_amount || 0),
                finalMode,
                notes !== undefined ? notes : existing.notes,
                flags.taxable,
                flags.cnss_subject,
                flags.cnamgs_subject,
                flags.tcs_subject,
                flags.irpp_subject,
                lineId,
                slipId,
            ]
        );

        /*
         * Modification du salaire de base :
         * on synchronise payroll_slips.base_salary, car calculateSlip
         * régénère la ligne SAL_BASE à partir de cette valeur.
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
                [base_amount !== undefined ? finalBase : finalGain, slipId]
            );
        }

        const totals = await recalculateKeepDraft(client, slipId, companyId);

        await client.query("COMMIT");

        return res.json({
            message: "Ligne modifiée avec succès.",
            line: result.rows[0],
            totals,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur modification ligne bulletin :", error);

        return handleError(
            res,
            error,
            "Erreur lors de la modification de la ligne."
        );
    } finally {
        client.release();
    }
};

/* =====================================================
   SUPPRIMER UNE LIGNE
===================================================== */

const deleteLine = async (req, res) => {
    const client = await pool.connect();

    try {
        const { slipId, lineId } = req.params;
        const companyId = req.user.companyId;

        await client.query("BEGIN");

        await getEditableSlip(client, slipId, companyId);

        const existingResult = await client.query(
            `
            SELECT l.id, l.code, l.origin
            FROM payroll_slip_lines l
            INNER JOIN payroll_slips s
                ON s.id = l.slip_id
            WHERE l.id = $1
              AND l.slip_id = $2
              AND s.company_id = $3
            `,
            [lineId, slipId, companyId]
        );

        if (existingResult.rowCount === 0) {
            throw new Error("LINE_NOT_FOUND");
        }

        const existing = existingResult.rows[0];

        if (existing.origin === "system" && existing.code !== "SAL_BASE") {
            throw new Error("LINE_AUTOMATIC");
        }

        await client.query(
            `
            DELETE FROM payroll_slip_lines
            WHERE id = $1
              AND slip_id = $2
            `,
            [lineId, slipId]
        );

        /*
         * Salaire de base supprimé : base_salary repasse à 0,
         * sinon calculateSlip recréerait la ligne.
         */
        if (existing.code === "SAL_BASE") {
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

        const totals = await recalculateKeepDraft(client, slipId, companyId);

        await client.query("COMMIT");

        return res.json({
            message: "Ligne supprimée avec succès.",
            totals,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur suppression ligne bulletin :", error);

        return handleError(
            res,
            error,
            "Erreur lors de la suppression de la ligne."
        );
    } finally {
        client.release();
    }
};

module.exports = {
    getLines,
    createLine,
    updateLine,
    deleteLine,
};