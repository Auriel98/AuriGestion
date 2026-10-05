const express = require("express");

const controller = require("../../controllers/attendance/attendance.controller");

const authenticate = require("../../middlewares/auth.middleware");

const requirePermission = require("../../middlewares/permission.middleware");

const router = express.Router();


// =====================================================
// MINI DASHBOARD
// =====================================================

router.get(
    "/stats",
    authenticate,
    requirePermission("attendance", "view"),
    controller.getAttendanceStats
);


// =====================================================
// LISTE DES PRESENCES
// =====================================================

router.get(
    "/",
    authenticate,
    requirePermission("attendance", "view"),
    controller.getAttendance
);


// =====================================================
// ENREGISTRER UN POINTAGE
// =====================================================

router.post(
    "/",
    authenticate,
    requirePermission("attendance", "create"),
    controller.saveAttendance
);


// =====================================================
// MODIFIER UN POINTAGE
// =====================================================

router.put(
    "/",
    authenticate,
    requirePermission("attendance", "update"),
    controller.saveAttendance
);


module.exports = router;