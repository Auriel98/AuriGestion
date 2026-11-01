const express = require("express");

const controller = require(
    "../../controllers/employee/employee.controller"
);

const authenticate = require(
    "../../middlewares/auth.middleware"
);

const requirePermission = require(
    "../../middlewares/permission.middleware"
);

const {
    uploadEmployeePhoto,
} = require("../../middlewares/upload.middleware");

const router = express.Router();

/* =====================================================
   STATISTIQUES EMPLOYÉS
===================================================== */

router.get(
    "/stats",
    authenticate,
    requirePermission("employees", "view"),
    controller.getEmployeeStats
);

/* =====================================================
   LISTE DES EMPLOYÉS
===================================================== */

router.get(
    "/",
    authenticate,
    requirePermission("employees", "view"),
    controller.getEmployees
);

/* =====================================================
   DÉTAIL D'UN EMPLOYÉ
===================================================== */

router.get(
    "/:id",
    authenticate,
    requirePermission("employees", "view"),
    controller.getEmployeeById
);

/* =====================================================
   CRÉATION D'UN EMPLOYÉ AVEC PHOTO OPTIONNELLE
   Nom du champ multipart/form-data : photo
===================================================== */

router.post(
    "/",
    authenticate,
    requirePermission("employees", "create"),
    uploadEmployeePhoto.single("photo"),
    controller.createEmployee
);

/* =====================================================
   MODIFICATION D'UN EMPLOYÉ
   Photo facultative : une nouvelle photo peut être envoyée
===================================================== */

router.put(
    "/:id",
    authenticate,
    requirePermission("employees", "update"),
    uploadEmployeePhoto.single("photo"),
    controller.updateEmployee
);

/* =====================================================
   SUPPRESSION DE LA PHOTO D'UN EMPLOYÉ
===================================================== */

router.delete(
    "/:id/photo",
    authenticate,
    requirePermission("employees", "update"),
    controller.deleteEmployeePhoto
);

/* =====================================================
   ACTIVATION / DÉSACTIVATION D'UN EMPLOYÉ
===================================================== */

router.patch(
    "/:id/status",
    authenticate,
    requirePermission("employees", "update"),
    controller.toggleEmployeeStatus
);

/* =====================================================
   SUPPRESSION D'UN EMPLOYÉ
===================================================== */

router.delete(
    "/:id",
    authenticate,
    requirePermission("employees", "delete"),
    controller.deleteEmployee
);

module.exports = router;
