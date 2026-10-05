const express = require("express");

const authenticate =
    require("../../middlewares/auth.middleware");

const requirePermission =
    require("../../middlewares/permission.middleware");

const controller =
    require("../../controllers/payroll/payrollSettings.controller");

const router = express.Router();

router.use(authenticate);


/*
 * Voir les paramètres
 */
router.get(
    "/",
    requirePermission("payroll", "view"),
    controller.getSettings
);


/*
 * Modifier les paramètres
 */
router.put(
    "/",
    requirePermission("payroll", "update"),
    controller.updateSettings
);


/*
 * Initialiser la paie
 */
router.post(
    "/initialize",
    requirePermission("payroll", "update"),
    controller.initialize
);


module.exports = router;