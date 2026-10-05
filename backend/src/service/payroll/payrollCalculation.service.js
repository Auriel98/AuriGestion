const pool = require("../../config/db");

/**
 * Codes des règles considérées comme cotisations sociales salariales.
 * Leur cumul sert de base au type "after_social_contributions".
 * Ce sont les codes des RÈGLES (payroll_rules.code), pas des composants.
 */
const SOCIAL_CONTRIBUTION_CODES = ["CNSS_EMP", "CNAMGS_EMP"];

/**
 * Arrondit un montant.
 */
const roundAmount = (amount, decimals = 0) => {
    const factor = Math.pow(10, Number(decimals) || 0);

    return Math.round(Number(amount || 0) * factor) / factor;
};

/**
 * Récupère les paramètres de paie.
 */
const getPayrollSettings = async (client, companyId) => {
    const result = await client.query(
        `
        SELECT *
        FROM payroll_settings
        WHERE company_id = $1
        `,
        [companyId]
    );

    if (result.rowCount === 0) {
        throw new Error("PAYROLL_SETTINGS_NOT_FOUND");
    }

    return result.rows[0];
};

/**
 * Récupère les règles applicables à une date donnée, dans l'ordre configuré.
 *
 * Une règle est appliquée uniquement si :
 *  - la règle est active ;
 *  - le composant lié (s'il existe) est actif ;
 *  - la date de paie est dans sa période de validité.
 */
const getActiveRules = async (client, companyId, date) => {
    const result = await client.query(
        `
        SELECT
            r.*,
            pc.code AS component_code,
            pc.name AS component_name,
            pc.category AS component_category,
            pc.taxable,
            pc.cnss_subject,
            pc.cnamgs_subject,
            pc.tcs_subject,
            pc.irpp_subject
        FROM payroll_rules r
        LEFT JOIN payroll_components pc
            ON pc.id = r.component_id
        WHERE r.company_id = $1
          AND r.is_active = TRUE
          AND COALESCE(pc.is_active, TRUE) = TRUE
          AND r.effective_from <= $2
          AND (
              r.effective_to IS NULL
              OR r.effective_to >= $2
          )
        ORDER BY
            r.sort_order ASC,
            r.name ASC
        `,
        [companyId, date]
    );

    return result.rows;
};

/**
 * Récupère les tranches d'une règle.
 */
const getRuleBrackets = async (client, ruleId) => {
    const result = await client.query(
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

    return result.rows;
};

/**
 * Calcule une cotisation proportionnelle (avec plancher / plafond).
 */
const calculatePercentage = ({
    base,
    rate = 0,
    ceilingAmount = null,
    floorAmount = null,
}) => {
    let amount = Number(base || 0);

    if (floorAmount !== null && floorAmount !== undefined) {
        amount = Math.max(amount, Number(floorAmount));
    }

    if (ceilingAmount !== null && ceilingAmount !== undefined) {
        amount = Math.min(amount, Number(ceilingAmount));
    }

    return (amount * Number(rate || 0)) / 100;
};

/**
 * Calcule un barème progressif.
 * Le taux de chaque tranche s'applique à la part de la base
 * comprise dans cette tranche. fixed_amount est ignoré
 * (garder 0 en base) pour éviter tout double comptage.
 */
const calculateProgressive = (base, brackets) => {
    const amount = Number(base || 0);

    if (amount <= 0 || !brackets.length) {
        return 0;
    }

    let total = 0;

    for (const bracket of brackets) {
        const minimum = Number(bracket.minimum_amount || 0);

        const maximum =
            bracket.maximum_amount === null ||
            bracket.maximum_amount === undefined
                ? Infinity
                : Number(bracket.maximum_amount);

        if (amount <= minimum) {
            break;
        }

        const taxablePart = Math.min(amount, maximum) - minimum;

        if (taxablePart <= 0) {
            continue;
        }

        total += (taxablePart * Number(bracket.rate || 0)) / 100;

        if (amount <= maximum) {
            break;
        }
    }

    return total;
};

/**
 * Détermine la base d'une règle.
 *
 * gross_salary               = brut
 * base_salary                = salaire de base du bulletin
 * taxable_salary             = gains dont la ligne est marquée taxable
 * after_social_contributions = brut - cotisations sociales déjà calculées
 *                              (uniquement celles qui sont actives)
 * cnss_subject / cnamgs_subject / tcs_subject / irpp_subject
 *                            = somme des gains marqués soumis à cet impôt
 */
const resolveRuleBase = ({
    rule,
    grossSalary,
    taxableSalary,
    baseSalary,
    employeeContributionTotal = 0,
    subjectBases = {},
}) => {
    switch (rule.base_type) {
        case "gross_salary":
            return grossSalary;

        case "taxable_salary":
            return taxableSalary;

        case "base_salary":
            return baseSalary;

        case "after_social_contributions":
            return Math.max(0, grossSalary - employeeContributionTotal);

        case "cnss_subject":
            return subjectBases.cnss || 0;

        case "cnamgs_subject":
            return subjectBases.cnamgs || 0;

        case "tcs_subject":
            return subjectBases.tcs || 0;

        case "irpp_subject":
            return subjectBases.irpp || 0;

        default:
            return grossSalary;
    }
};

/**
 * Calcule une règle.
 */
const calculateRule = async ({
    client,
    rule,
    grossSalary,
    taxableSalary,
    baseSalary,
    employeeContributionTotal,
    subjectBases,
}) => {
    const base = resolveRuleBase({
        rule,
        grossSalary,
        taxableSalary,
        baseSalary,
        employeeContributionTotal,
        subjectBases,
    });

    let employeeAmount = 0;
    let employerAmount = 0;

    if (rule.calculation_method === "progressive") {
        const brackets = await getRuleBrackets(client, rule.id);

        employeeAmount = calculateProgressive(base, brackets);
    } else {
        employeeAmount = calculatePercentage({
            base,
            rate: rule.employee_rate,
            ceilingAmount: rule.ceiling_amount,
            floorAmount: rule.floor_amount,
        });

        employerAmount = calculatePercentage({
            base,
            rate: rule.employer_rate,
            ceilingAmount: rule.ceiling_amount,
            floorAmount: rule.floor_amount,
        });
    }

    /*
     * Exonération éventuelle.
     */
    const exemption = Number(rule.exemption_amount || 0);

    if (exemption > 0) {
        employeeAmount = Math.max(0, employeeAmount - exemption);
    }

    return {
        base,
        employeeAmount,
        employerAmount,
    };
};

/**
 * Supprime les lignes générées automatiquement
 * (salaire de base, taxes, parts patronales).
 * Les lignes saisies à la main ne sont jamais touchées.
 *
 * C'est ce qui permet de retirer du bulletin une taxe désactivée
 * lors d'un recalcul : ses anciennes lignes sont supprimées ici
 * et elles ne sont plus recréées.
 */
const deleteSystemLines = async (client, slipId) => {
    await client.query(
        `
        DELETE FROM payroll_slip_lines
        WHERE slip_id = $1
          AND origin = 'system'
          AND (
              category IN ('tax', 'employer_contribution')
              OR code IN ('SAL_BASE', 'SALAIRE_BASE')
          )
        `,
        [slipId]
    );
};

/**
 * Ajoute une ligne automatique.
 */
const insertSystemLine = async (
    client,
    {
        slipId,
        componentId = null,
        code,
        designation,
        category,
        baseAmount = 0,
        rate = null,
        gain = 0,
        deduction = 0,
        employerAmount = 0,
        sortOrder,
        taxable = false,
        cnssSubject = false,
        cnamgsSubject = false,
        tcsSubject = false,
        irppSubject = false,
    }
) => {
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
            rate,
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
            $1, $2, $3, $4, $5,
            1,
            $6, $7, $8, $9, $10, $11,
            'system',
            'fixed',
            $12, $13, $14, $15, $16
        )
        `,
        [
            slipId,
            componentId,
            code,
            designation,
            category,
            baseAmount,
            rate,
            gain,
            deduction,
            employerAmount,
            sortOrder,
            taxable,
            cnssSubject,
            cnamgsSubject,
            tcsSubject,
            irppSubject,
        ]
    );
};

/**
 * Recalcule complètement le bulletin.
 * Peut être relancé tant que le bulletin et la période
 * ne sont pas validés.
 */
const calculateSlip = async ({ client, slipId, companyId }) => {
    const slipResult = await client.query(
        `
        SELECT
            s.*,
            p.period_year,
            p.period_month,
            p.start_date,
            p.end_date,
            p.status AS period_status
        FROM payroll_slips s
        INNER JOIN payroll_periods p
            ON p.id = s.period_id
        WHERE s.id = $1
          AND s.company_id = $2
        FOR UPDATE OF s
        `,
        [slipId, companyId]
    );

    if (slipResult.rowCount === 0) {
        throw new Error("SLIP_NOT_FOUND");
    }

    const slip = slipResult.rows[0];

    const editableStatuses = ["draft", "calculated"];

    if (
        !editableStatuses.includes(slip.status) ||
        !editableStatuses.includes(slip.period_status)
    ) {
        throw new Error("SLIP_NOT_EDITABLE");
    }

    const settings = await getPayrollSettings(client, companyId);
    const decimals = settings.rounding_decimals;

    /*
     * Nettoyer les anciennes lignes automatiques.
     */
    await deleteSystemLines(client, slipId);

    /*
     * Composant SAL_BASE : ses indicateurs (taxable, cnss_subject...)
     * sont copiés sur la ligne du salaire de base.
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
     * Ligne du salaire de base (proratisée si jours payés renseignés).
     * La base de jours vient des paramètres : monthly_work_days.
     */
    const daysBasis = Number(settings.monthly_work_days) || 30;
    const paidDays = Number(slip.paid_days || 0);
    const baseSalary = Number(slip.base_salary || 0);

    const baseGain =
        paidDays > 0 && paidDays < daysBasis
            ? roundAmount((baseSalary * paidDays) / daysBasis, decimals)
            : baseSalary;

    if (baseGain > 0) {
        await insertSystemLine(client, {
            slipId,
            componentId: baseComponent?.id || null,
            code: "SAL_BASE",
            designation: "Salaire de base",
            category: "earning",
            baseAmount: baseSalary,
            gain: baseGain,
            sortOrder: 1,
            taxable: baseComponent?.taxable || false,
            cnssSubject: baseComponent?.cnss_subject || false,
            cnamgsSubject: baseComponent?.cnamgs_subject || false,
            tcsSubject: baseComponent?.tcs_subject || false,
            irppSubject: baseComponent?.irpp_subject || false,
        });
    }

    /*
     * Totaux avant taxes, calculés à partir des indicateurs
     * enregistrés directement sur les lignes.
     */
    const totalsResult = await client.query(
        `
        SELECT
            COALESCE(SUM(gain) FILTER (
                WHERE category = 'earning'
            ), 0) AS gross,

            COALESCE(SUM(gain) FILTER (
                WHERE category = 'non_taxable_earning'
            ), 0) AS non_taxable,

            COALESCE(SUM(deduction) FILTER (
                WHERE category = 'deduction'
            ), 0) AS other_deductions,

            COALESCE(SUM(gain) FILTER (
                WHERE category = 'earning'
                  AND taxable = TRUE
            ), 0) AS taxable_salary,

            COALESCE(SUM(gain) FILTER (
                WHERE category = 'earning'
                  AND cnss_subject = TRUE
            ), 0) AS cnss_base,

            COALESCE(SUM(gain) FILTER (
                WHERE category = 'earning'
                  AND cnamgs_subject = TRUE
            ), 0) AS cnamgs_base,

            COALESCE(SUM(gain) FILTER (
                WHERE category = 'earning'
                  AND tcs_subject = TRUE
            ), 0) AS tcs_base,

            COALESCE(SUM(gain) FILTER (
                WHERE category = 'earning'
                  AND irpp_subject = TRUE
            ), 0) AS irpp_base
        FROM payroll_slip_lines
        WHERE slip_id = $1
        `,
        [slipId]
    );

    const totalsRow = totalsResult.rows[0];

    const grossSalary = Number(totalsRow.gross || 0);
    const nonTaxableGains = Number(totalsRow.non_taxable || 0);
    const otherDeductions = Number(totalsRow.other_deductions || 0);
    const taxableSalary = Number(totalsRow.taxable_salary || 0);

    const subjectBases = {
        cnss: Number(totalsRow.cnss_base || 0),
        cnamgs: Number(totalsRow.cnamgs_base || 0),
        tcs: Number(totalsRow.tcs_base || 0),
        irpp: Number(totalsRow.irpp_base || 0),
    };

    /*
     * Règles applicables (actives uniquement), dans l'ordre configuré.
     */
    const referenceDate = slip.end_date || new Date();

    const rules = await getActiveRules(client, companyId, referenceDate);

    let taxDeductions = 0;
    let employerContributions = 0;
    let employeeContributionTotal = 0;
    let sortOrder = 100;

    for (const rule of rules) {
        const result = await calculateRule({
            client,
            rule,
            grossSalary,
            taxableSalary,
            baseSalary: Number(slip.base_salary || 0),
            employeeContributionTotal,
            subjectBases,
        });

        const employeeAmount = roundAmount(result.employeeAmount, decimals);
        const employerAmount = roundAmount(result.employerAmount, decimals);

        if (employeeAmount === 0 && employerAmount === 0) {
            continue;
        }

        /*
         * Cotisation / taxe salariale.
         */
        if (employeeAmount > 0) {
            await insertSystemLine(client, {
                slipId,
                componentId: rule.component_id,
                code: rule.code,
                designation: rule.name,
                category: "tax",
                baseAmount: result.base,
                rate: rule.employee_rate,
                deduction: employeeAmount,
                sortOrder: sortOrder++,
            });

            taxDeductions += employeeAmount;

            if (SOCIAL_CONTRIBUTION_CODES.includes(rule.code)) {
                employeeContributionTotal += employeeAmount;
            }
        }

        /*
         * Part patronale.
         */
        if (employerAmount > 0) {
            await insertSystemLine(client, {
                slipId,
                componentId: rule.component_id,
                code: `${rule.code}_EMP`,
                designation: `${rule.name} - Part employeur`,
                category: "employer_contribution",
                baseAmount: result.base,
                rate: rule.employer_rate,
                employerAmount,
                sortOrder: sortOrder++,
            });

            employerContributions += employerAmount;
        }
    }

    /*
     * Totaux finaux.
     */
    const employeeDeductions = roundAmount(
        taxDeductions + otherDeductions,
        decimals
    );

    const netSalary = roundAmount(
        grossSalary + nonTaxableGains - employeeDeductions,
        decimals
    );

    await client.query(
        `
        UPDATE payroll_slips
        SET
            gross_salary = $1,
            taxable_salary = $2,
            tax_base = $2,
            employee_deductions = $3,
            employer_contributions = $4,
            net_salary = $5,
            net_to_pay = $5,
            status = 'calculated',
            updated_at = NOW()
        WHERE id = $6
        `,
        [
            grossSalary,
            taxableSalary,
            employeeDeductions,
            employerContributions,
            netSalary,
            slipId,
        ]
    );

    return {
        gross_salary: grossSalary,
        taxable_salary: taxableSalary,
        non_taxable_gains: nonTaxableGains,
        employee_deductions: employeeDeductions,
        employer_contributions: employerContributions,
        net_salary: netSalary,
        net_to_pay: netSalary,
    };
};

module.exports = {
    calculateSlip,
    getPayrollSettings,
    getActiveRules,
};