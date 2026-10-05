const express = require("express");

const controller =
    require("../../controllers/contract/contract.controller");

const authenticate =
    require("../../middlewares/auth.middleware");

const requirePermission =
    require("../../middlewares/permission.middleware");

const router =
    express.Router();


// Statistiques
router.get(
    "/stats",
    authenticate,
    requirePermission("contracts", "view"),
    controller.getContractStats
);


// Employés actifs pour le formulaire
router.get(
    "/employees",
    authenticate,
    requirePermission("contracts", "view"),
    controller.getEmployees
);


// Liste
router.get(
    "/",
    authenticate,
    requirePermission("contracts", "view"),
    controller.getContracts
);


// Détail
router.get(
    "/:id",
    authenticate,
    requirePermission("contracts", "view"),
    controller.getContractById
);


// Création
router.post(
    "/",
    authenticate,
    requirePermission("contracts", "create"),
    controller.createContract
);


// Modification
router.put(
    "/:id",
    authenticate,
    requirePermission("contracts", "update"),
    controller.updateContract
);


// Suppression
router.delete(
    "/:id",
    authenticate,
    requirePermission("contracts", "delete"),
    controller.deleteContract
);


module.exports = router;