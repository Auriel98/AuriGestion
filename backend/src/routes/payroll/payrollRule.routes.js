const express = require("express");

const controller = require("../../controllers/payroll/payrollRule.controller");

const authenticate = require("../../middlewares/auth.middleware");
const requirePermission = require("../../middlewares/permission.middleware");

const router = express.Router();

/**
 * Liste
 */
router.get(
  "/",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getRules
);

/**
 * Détail
 */
router.get(
  "/:id",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getRuleById
);

/**
 * Création
 */
router.post(
  "/",
  authenticate,
  requirePermission("payroll", "create"),
  controller.createRule
);

/**
 * Modification
 */
router.put(
  "/:id",
  authenticate,
  requirePermission("payroll", "update"),
  controller.updateRule
);

/**
 * Activer / désactiver
 */
router.patch(
  "/:id/status",
  authenticate,
  requirePermission("payroll", "update"),
  controller.toggleRule
);

/**
 * Suppression
 */
router.delete(
  "/:id",
  authenticate,
  requirePermission("payroll", "delete"),
  controller.deleteRule
);

module.exports = router;