const express = require("express");

const authenticate = require("../../middlewares/auth.middleware");
const requirePermission = require("../../middlewares/permission.middleware");

const controller = require("../../controllers/payroll/payrollSlipLine.controller");

const router = express.Router();

router.use(authenticate);

router.get(
    "/:slipId/lines",
    requirePermission("payroll", "view"),
    controller.getLines
);

router.post(
    "/:slipId/lines",
    requirePermission("payroll", "update"),
    controller.createLine
);

router.put(
    "/:slipId/lines/:lineId",
    requirePermission("payroll", "update"),
    controller.updateLine
);

router.delete(
    "/:slipId/lines/:lineId",
    requirePermission("payroll", "delete"),
    controller.deleteLine
);

module.exports = router;