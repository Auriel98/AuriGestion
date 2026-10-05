const express = require("express");

const controller = require("../../controllers/payroll/payrollComponent.controller");

const authenticate = require("../../middlewares/auth.middleware");
const requirePermission = require("../../middlewares/permission.middleware");

const router = express.Router();

/**
 * Statistiques
 */
router.get(
  "/stats",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getComponentStats
);

/**
 * Liste
 */
router.get(
  "/",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getComponents
);

/**
 * Détail
 */
router.get(
  "/:id",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getComponentById
);

/**
 * Création
 */
router.post(
  "/",
  authenticate,
  requirePermission("payroll", "create"),
  controller.createComponent
);

/**
 * Modification
 */
router.put(
  "/:id",
  authenticate,
  requirePermission("payroll", "update"),
  controller.updateComponent
);

/**
 * Activer / désactiver
 */
router.patch(
  "/:id/status",
  authenticate,
  requirePermission("payroll", "update"),
  controller.toggleComponent
);

/**
 * Suppression
 */
router.delete(
  "/:id",
  authenticate,
  requirePermission("payroll", "delete"),
  controller.deleteComponent
);

module.exports = router;