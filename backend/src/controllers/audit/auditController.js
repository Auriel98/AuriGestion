const auditService = require("../../service/audit/auditService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_ACTIONS = ["INSERT", "UPDATE", "DELETE"];

const TABLE_REGEX = /^[a-z_]{1,100}$/;

const getCompanyId = (req, res) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentification requise.",
    });
    return null;
  }

  const companyId = req.user.companyId;

  if (!companyId) {
    res.status(401).json({
      success: false,
      message: "Entreprise non identifiée.",
    });
    return null;
  }

  return companyId;
};

/**
 * Récupère le journal d'audit (avec filtres et pagination).
 */
const getAuditLogs = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);

    if (!companyId) {
      return;
    }

    const { userId, action, tableName, dateFrom, dateTo } = req.query;

    if (userId && !UUID_REGEX.test(userId)) {
      return res.status(400).json({
        success: false,
        message: "Utilisateur invalide.",
      });
    }

    if (action && !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action invalide.",
      });
    }

    if (tableName && !TABLE_REGEX.test(tableName)) {
      return res.status(400).json({
        success: false,
        message: "Table invalide.",
      });
    }

    if (
      (dateFrom && !DATE_REGEX.test(dateFrom)) ||
      (dateTo && !DATE_REGEX.test(dateTo))
    ) {
      return res.status(400).json({
        success: false,
        message: "Format de date invalide (AAAA-MM-JJ attendu).",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20)
    );

    const result = await auditService.getAuditLogs(companyId, {
      userId: userId || null,
      action: action || null,
      tableName: tableName || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du journal d'audit :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer le journal d'audit.",
    });
  }
};

/**
 * Récupère les valeurs disponibles pour les filtres.
 */
const getAuditFilters = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);

    if (!companyId) {
      return;
    }

    const filters = await auditService.getAuditFilters(companyId);

    return res.status(200).json({
      success: true,
      data: filters,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des filtres d'audit :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les filtres.",
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditFilters,
};