// =====================================================
// LIBELLES ET OUTILS COMMUNS DE LA PAIE
// =====================================================

export const CATEGORY_LABELS = {
    earning: "Gain",
    non_taxable_earning: "Indemnité non imposable",
    employee_contribution: "Cotisation salariale",
    employer_contribution: "Charge patronale",
    tax: "Impôt",
    deduction: "Retenue"
};

export const CATEGORY_HELP = {
    earning:
        "Gain imposable ajouté au brut (sursalaire, prime...). Affecté à chaque employé concerné.",
    non_taxable_earning:
        "Indemnité hors brut (ex : transport). Ajoutée au net à payer. Affectée à chaque employé concerné.",
    employee_contribution:
        "Cotisation retenue sur le salaire (CNSS, CNAMGS...). S'applique automatiquement à tous les employés.",
    employer_contribution:
        "Charge payée par l'entreprise. S'applique automatiquement à tous les employés.",
    tax:
        "Impôt retenu sur le salaire (TCS, IRPP...). S'applique automatiquement à tous les employés.",
    deduction:
        "Retenue sur le net (avance, acompte, trop perçu). Affectée ou saisie sur le bulletin."
};

export const CALC_LABELS = {
    fixed: "Montant fixe",
    percent: "Pourcentage",
    bracket: "Barème progressif",
    manual: "Saisie manuelle"
};

export const BASE_LABELS = {
    base_salary: "Salaire de base",
    gross: "Total brut",
    social_base: "Base sociale (brut soumis)",
    taxable_base: "Base imposable"
};

export const PERIOD_LABELS = {
    monthly: "Mensuel",
    annual: "Annuel"
};

export const PAYMENT_LABELS = {
    especes: "Espèces",
    virement: "Virement",
    cheque: "Chèque",
    mobile_money: "Mobile money"
};

// Modes de calcul autorisés selon la catégorie
export const CALC_OPTIONS_BY_CATEGORY = {
    earning: ["fixed", "percent", "manual"],
    non_taxable_earning: ["fixed", "manual"],
    employee_contribution: ["percent", "fixed"],
    employer_contribution: ["percent", "fixed"],
    tax: ["percent", "bracket", "fixed"],
    deduction: ["fixed", "percent", "manual"]
};

// Bases de calcul autorisées selon la catégorie
export const BASE_OPTIONS_BY_CATEGORY = {
    earning: ["base_salary"],
    non_taxable_earning: ["base_salary"],
    employee_contribution: ["base_salary", "gross", "social_base"],
    employer_contribution: ["base_salary", "gross", "social_base"],
    tax: ["base_salary", "gross", "social_base", "taxable_base"],
    deduction: ["base_salary", "gross"]
};


export const formatMoney = (value) =>
    `${Math.round(Number(value) || 0).toLocaleString("fr-FR")} FCFA`;


export const formatNumber = (value) =>
    Number(value || 0).toLocaleString("fr-FR", {
        maximumFractionDigits: 2
    });
