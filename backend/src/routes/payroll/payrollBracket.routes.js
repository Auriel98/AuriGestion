const express = require("express");

const authenticate =
    require("../../middlewares/auth.middleware");

const requirePermission =
    require("../../middlewares/permission.middleware");

const controller =
    require("../../controllers/payroll/payrollBracket.controller");

const router = express.Router();

router.use(authenticate);


/*
 * Liste des tranches
 */
router.get(
    "/rules/:ruleId/brackets",
    requirePermission("payroll", "view"),
    controller.getBrackets
);


/*
 * Ajouter
 */
router.post(
    "/rules/:ruleId/brackets",
    requirePermission("payroll", "update"),
    controller.createBracket
);


/*
 * Modifier
 */
router.put(
    "/rules/:ruleId/brackets/:bracketId",
    requirePermission("payroll", "update"),
    controller.updateBracket
);


/*
 * Supprimer
 */
router.delete(
    "/rules/:ruleId/brackets/:bracketId",
    requirePermission("payroll", "delete"),
    controller.deleteBracket
);


module.exports = router;