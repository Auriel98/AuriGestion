const express = require("express");

const controller = require("../../controllers/payroll/payrollPeriod.controller");

const authenticate = require("../../middlewares/auth.middleware");
const requirePermission = require("../../middlewares/permission.middleware");

const router = express.Router();

router.get(
  "/stats",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getPeriodStats
);

router.get(
  "/",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getPeriods
);

router.get(
  "/:id/employees",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getPeriodEmployees
);

router.put(
  "/:id/employees",
  authenticate,
  requirePermission("payroll", "update"),
  controller.selectPeriodEmployees
);

router.get(
  "/:id",
  authenticate,
  requirePermission("payroll", "view"),
  controller.getPeriodById
);

router.post(
  "/",
  authenticate,
  requirePermission("payroll", "create"),
  controller.createPeriod
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("payroll", "update"),
  controller.updatePeriodStatus
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("payroll", "delete"),
  controller.deletePeriod
);

module.exports = router;