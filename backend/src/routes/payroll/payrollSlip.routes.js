const express = require("express");

const controller = require("../../controllers/payroll/payrollSlip.controller");

const authenticate = require("../../middlewares/auth.middleware");
const requirePermission = require("../../middlewares/permission.middleware");

const router = express.Router();

/*
 * Attention à l'ordre :
 * Les routes /period/... et /:id/calculate
 * doivent être définies avant /:id
 */

router.get(
  "/period/:periodId/stats",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getSlipStats
);

router.get(
  "/period/:periodId",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getSlips
);

router.post(
  "/period/:periodId/prepare",
  authenticate,
  requirePermission("payroll", "create"),
  controller.prepareSlips
);

router.post(
  "/:id/calculate",
  authenticate,
  requirePermission("payroll", "update"),
  controller.calculateSlipTaxes
);

router.get(
  "/:id",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getSlipById
);

router.put(
  "/:id",
  authenticate,
  requirePermission("payroll", "update"),
  controller.updateSlip
);

module.exports = router;