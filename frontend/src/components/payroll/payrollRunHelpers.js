// =====================================================
// OUTILS DES PERIODES DE PAIE ET DES BULLETINS
// =====================================================

export const MONTHS = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
];

export const RUN_STATUS_LABELS = {
    draft: "Brouillon",
    validated: "Validée",
    paid: "Payée"
};

export const periodLabel = (year, month) =>
    `${MONTHS[Number(month) - 1] || ""} ${year}`;

// "2026-10-03" -> "03/10/2026"
export const formatDate = (value) => {

    if (!value) return "";

    const [year, month, day] = String(value).slice(0, 10).split("-");

    return `${day}/${month}/${year}`;
};
