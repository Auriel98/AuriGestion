const pool = require("../../config/db");

/**
 * Définition d'un composant par défaut.
 * flags = [taxable, cnss, cnamgs, tcs, irpp]
 */
const component = (code, name, category, method, flags, specialCode = null) => ({
    code,
    name,
    category,
    method,
    taxable: flags[0],
    cnss: flags[1],
    cnamgs: flags[2],
    tcs: flags[3],
    irpp: flags[4],
    specialCode,
});

const ALL = [true, true, true, true, true];
const NONE = [false, false, false, false, false];

const DEFAULT_COMPONENTS = [
    component("SAL_BASE", "Salaire de base", "earning", "fixed", ALL, "SALARY_BASE"),
    component("SURSALAIRE", "Sursalaire", "earning", "manual", ALL),
    component("PRIME", "Prime", "earning", "manual", ALL),
    component("HEURES_SUPP", "Heures supplémentaires", "earning", "manual", ALL),
    component("TRANSPORT", "Indemnité de transport", "earning", "manual", NONE),
    component("LOGEMENT", "Indemnité de logement", "earning", "manual", ALL),
    component("GRATIFICATION", "Gratification", "earning", "manual", ALL),
    component("CONGES_PAYES", "Congés payés", "earning", "manual", ALL),

    component("ABSENCE", "Retenue pour absence", "deduction", "days", NONE),
    component("AVANCE", "Avance sur salaire", "deduction", "manual", NONE),
    component("ACOMPTE", "Acompte", "deduction", "manual", NONE),

    component("CNSS", "CNSS salarié", "tax", "percentage", NONE, "CNSS_EMP"),
    component("CNAMGS", "CNAMGS salarié", "tax", "percentage", NONE, "CNAMGS_EMP"),
    component("TCS", "Taxe complémentaire sur salaire", "tax", "percentage", NONE, "TCS"),
    component(
        "IRPP",
        "Impôt sur le revenu des personnes physiques",
        "tax",
        "progressive",
        NONE,
        "IRPP"
    ),
];

/**
 * Règles par défaut (configuration initiale, modifiable
 * ensuite depuis Paramètres > Paie).
 */
const DEFAULT_RULES = [
    {
        code: "CNSS_EMP",
        name: "CNSS salarié",
        rule_type: "cotisation",
        calculation_method: "percentage",
        employee_rate: 5,
        employer_rate: 18,
        ceiling_amount: 1500000,
        base_type: "gross_salary",
        sort_order: 10,
        component_code: "CNSS",
    },
    {
        code: "CNAMGS_EMP",
        name: "CNAMGS salarié",
        rule_type: "cotisation",
        calculation_method: "percentage",
        employee_rate: 2,
        employer_rate: 4.1,
        ceiling_amount: 2500000,
        base_type: "gross_salary",
        sort_order: 20,
        component_code: "CNAMGS",
    },
    {
        code: "TCS",
        name: "Taxe complémentaire sur salaire",
        rule_type: "tax",
        calculation_method: "percentage",
        employee_rate: 5,
        employer_rate: 0,
        ceiling_amount: null,
        base_type: "gross_salary",
        sort_order: 30,
        component_code: "TCS",
    },
    {
        code: "IRPP",
        name: "IRPP",
        rule_type: "tax",
        calculation_method: "progressive",
        employee_rate: 0,
        employer_rate: 0,
        ceiling_amount: null,
        base_type: "taxable_salary",
        sort_order: 40,
        component_code: "IRPP",
    },
];

const initializePayroll = async (companyId) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        /*
         * 1. Paramètres généraux
         */
        await client.query(
            `
            INSERT INTO payroll_settings (
                company_id,
                currency,
                monthly_work_days,
                monthly_work_hours,
                rounding_decimals
            )
            VALUES ($1, 'FCFA', 30, 173.33, 0)
            ON CONFLICT (company_id)
            DO NOTHING
            `,
            [companyId]
        );

        /*
         * 2. Composants de paie
         * DO NOTHING : on ne touche jamais à un composant existant
         * (nom modifié, statut actif/inactif, indicateurs fiscaux...).
         */
        for (let i = 0; i < DEFAULT_COMPONENTS.length; i++) {
            const c = DEFAULT_COMPONENTS[i];

            await client.query(
                `
                INSERT INTO payroll_components (
                    company_id,
                    code,
                    name,
                    category,
                    calculation_method,
                    taxable,
                    cnss_subject,
                    cnamgs_subject,
                    tcs_subject,
                    irpp_subject,
                    special_code,
                    sort_order
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (company_id, code)
                DO NOTHING
                `,
                [
                    companyId,
                    c.code,
                    c.name,
                    c.category,
                    c.method,
                    c.taxable,
                    c.cnss,
                    c.cnamgs,
                    c.tcs,
                    c.irpp,
                    c.specialCode,
                    i + 1,
                ]
            );
        }

        /*
         * 3. Composants fiscaux (liés aux règles)
         */
        const componentResult = await client.query(
            `
            SELECT id, code
            FROM payroll_components
            WHERE company_id = $1
              AND code IN ('CNSS', 'CNAMGS', 'TCS', 'IRPP')
            `,
            [companyId]
        );

        const componentMap = {};

        for (const row of componentResult.rows) {
            componentMap[row.code] = row.id;
        }

        /*
         * 4. Règles par défaut
         * Si une règle avec ce code existe déjà (active OU inactive,
         * quelle que soit sa date d'effet), on n'y touche pas :
         * pas de doublon, pas de réactivation.
         */
        for (const rule of DEFAULT_RULES) {
            const exists = await client.query(
                `
                SELECT 1
                FROM payroll_rules
                WHERE company_id = $1
                  AND code = $2
                LIMIT 1
                `,
                [companyId, rule.code]
            );

            if (exists.rowCount > 0) {
                continue;
            }

            await client.query(
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
                    base_type,
                    sort_order,
                    effective_from,
                    is_active
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    CURRENT_DATE,
                    TRUE
                )
                `,
                [
                    companyId,
                    componentMap[rule.component_code] || null,
                    rule.code,
                    rule.name,
                    rule.rule_type,
                    rule.calculation_method,
                    rule.employee_rate,
                    rule.employer_rate,
                    rule.ceiling_amount,
                    rule.base_type,
                    rule.sort_order,
                ]
            );
        }

        await client.query("COMMIT");

        return {
            success: true,
            message: "Paramètres de paie initialisés avec succès.",
        };
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur initialisation paie :", error);

        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    initializePayroll,
};