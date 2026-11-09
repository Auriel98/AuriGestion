export const ROLES = {
    DIRECTEUR: "directeur",
    RH: "rh",
    COMPTABLE: "comptable",
    SECRETAIRE: "secretaire",
};

const ACTIONS = { C: "create", R: "read", U: "update", D: "delete" };

// crud("employees", "CRU") => ["employees:create", "employees:read", "employees:update"]
const crud = (module, letters) =>
    [...letters].map((l) => `${module}:${ACTIONS[l]}`);

// Actions spécifiques à la paie
export const PAYROLL = {
    VIEW_SALARIES: "payroll:view_salaries",
    CALCULATE_OVERTIME: "payroll:calculate_overtime",
    CONFIGURE_RATES: "payroll:configure_rates",
    GENERATE_SLIP: "payroll:generate_slip",
    GENERATE_BULK: "payroll:generate_bulk",
    EXPORT_PDF: "payroll:export_pdf",
    VALIDATE: "payroll:validate",
};

const ALL_PAYROLL = Object.values(PAYROLL);

export const PERMISSIONS = {

    // ─────────── DIRECTEUR : accès total ───────────
    [ROLES.DIRECTEUR]: ["*"],

    // ─────────── COMPTABLE : finances ───────────
    [ROLES.COMPTABLE]: [
        ...crud("employees", "R"),     // Employés ........ R
        // Utilisateurs .... aucun accès
        ...crud("attendance", "R"),    // Présence ........ R
        ...crud("contracts", "R"),     // Contrats ........ R
        ...crud("clients", "R"),       // Clients ......... R
        ...crud("budget", "CRU"),      // Budget .......... CRU
        ...crud("quotes", "CRU"),      // Devis ........... CRU
        ...crud("invoices", "CRU"),    // Factures (même droits que devis)
        ...crud("markets", "R"),       // Marchés ......... R
        ...crud("expenses", "CRUD"),   // Dépenses ........ CRUD
        ...crud("payroll", "CRU"),     // Paie ............ CRU
        ...crud("company", "R"),       // Entreprise (lecture)
        // Actions paie : toutes sauf configurer les taux d'heures sup
        ...ALL_PAYROLL.filter((a) => a !== PAYROLL.CONFIGURE_RATES),
    ],

    // ─────────── SECRÉTAIRE : administration courante ───────────
    [ROLES.SECRETAIRE]: [
        ...crud("employees", "R"),     // Employés ........ R
        // Utilisateurs .... aucun accès
        ...crud("attendance", "CRU"),  // Présence ........ CRU
        ...crud("contracts", "R"),     // Contrats ........ R
        ...crud("clients", "CRU"),     // Clients ......... CRU
        // Budget .......... aucun accès
        ...crud("quotes", "CRU"),      // Devis ........... CRU
        ...crud("invoices", "CRU"),    // Factures (même droits que devis)
        ...crud("markets", "R"),       // Marchés ......... R
        ...crud("expenses", "CR"),     // Dépenses ........ CR
        // Paie ............ aucun accès
        ...crud("company", "R"),       // Entreprise (lecture)
        // Actions paie : aucune
    ],

    // ─────────── RH : ressources humaines ───────────
    [ROLES.RH]: [
        ...crud("employees", "CRUD"),  // Employés ........ CRUD
        ...crud("users", "R"),         // Utilisateurs .... R
        ...crud("attendance", "CRUD"), // Présence ........ CRUD
        ...crud("contracts", "CRUD"),  // Contrats ........ CRUD
        // Clients ......... aucun accès
        ...crud("budget", "R"),        // Budget .......... R
        // Devis / Marchés / Dépenses : aucun accès
        ...crud("payroll", "CRU"),     // Paie ............ CRU
        ...crud("company", "R"),       // Entreprise (lecture)
        // Actions paie : heures sup, taux, bulletins (individuel + masse),
        // export PDF, voir les salaires. Pas de validation.
        PAYROLL.CALCULATE_OVERTIME,
        PAYROLL.CONFIGURE_RATES,
        PAYROLL.GENERATE_SLIP,
        PAYROLL.GENERATE_BULK,
        PAYROLL.EXPORT_PDF,
        PAYROLL.VIEW_SALARIES,
    ],
};

export const hasPermission = (role, permission) => {
    const perms = PERMISSIONS[String(role || "").toLowerCase()] || [];
    return perms.includes("*") || perms.includes(permission);
};