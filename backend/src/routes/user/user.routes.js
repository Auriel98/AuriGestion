const express = require("express");

const controller =
    require("../../controllers/user/user.controller");

const authenticate =
    require("../../middlewares/auth.middleware");

const requirePermission =
    require("../../middlewares/permission.middleware");


const router =
    express.Router();


// ============================================================
// MINI DASHBOARD
// ============================================================

router.get(
    "/stats",
    authenticate,
    requirePermission("users", "view"),
    controller.getUserStats
);


// ============================================================
// EMPLOYES DISPONIBLES (doit rester AVANT "/:id")
// ============================================================

router.get(
    "/available-employees",
    authenticate,
    requirePermission("users", "view"),
    controller.getAvailableEmployees
);


// ============================================================
// LISTE
// ============================================================

router.get(
    "/",
    authenticate,
    requirePermission("users", "view"),
    controller.getUsers
);


// ============================================================
// DETAIL
// ============================================================

router.get(
    "/:id",
    authenticate,
    requirePermission("users", "view"),
    controller.getUserById
);


// ============================================================
// CREATION
// ============================================================

router.post(
    "/",
    authenticate,
    requirePermission("users", "create"),
    controller.createUser
);


// ============================================================
// MODIFICATION
// ============================================================

router.put(
    "/:id",
    authenticate,
    requirePermission("users", "update"),
    controller.updateUser
);


// ============================================================
// ACTIVATION / DESACTIVATION
// ============================================================

router.patch(
    "/:id/status",
    authenticate,
    requirePermission("users", "update"),
    controller.toggleUserStatus
);


// ============================================================
// SUPPRESSION
// ============================================================

router.delete(
    "/:id",
    authenticate,
    requirePermission("users", "delete"),
    controller.deleteUser
);


module.exports = router;