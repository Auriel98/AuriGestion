const express = require("express");

const auditController = require("../../controllers/audit/auditController");
const authenticate = require("../../middlewares/auth.middleware");
const {
  authorizeRoles,
  AUDIT_ALLOWED_ROLES,
} = require("../../middlewares/role.middleware");

const router = express.Router();

// Valeurs disponibles pour les filtres (utilisateurs, tables)
router.get(
  "/filters",
  authenticate,
  authorizeRoles(...AUDIT_ALLOWED_ROLES),
  auditController.getAuditFilters
);

// Liste paginée du journal d'audit
router.get(
  "/",
  authenticate,
  authorizeRoles(...AUDIT_ALLOWED_ROLES),
  auditController.getAuditLogs
);

module.exports = router;