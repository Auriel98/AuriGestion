const express = require("express");

const controller = require("../../controllers/payroll/employerCharges.controller");

const authenticate = require("../../middlewares/auth.middleware");
const requirePermission = require("../../middlewares/permission.middleware");

const router = express.Router();

/**
 * Liste des services (filtre de la page)
 * GET /api/payroll/employer-charges/services
 */
router.get(
  "/services",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getServices
);

/**
 * Cumul par employé + total par mois + total société
 * GET /api/payroll/employer-charges/cumulative?year=2026|all&scope=all|validated
 */
router.get(
  "/cumulative",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getCumulative
);

/**
 * Historique mois par mois d'un employé
 * GET /api/payroll/employer-charges/employee/:employeeId?year=2026|all&scope=all|validated
 */
router.get(
  "/employee/:employeeId",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getEmployeeHistory
);

/**
 * Charges patronales d'un mois
 * GET /api/payroll/employer-charges?year=2026&month=11&service_id=...&status=actif
 */
router.get(
  "/",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getEmployerCharges
);

module.exports = router;