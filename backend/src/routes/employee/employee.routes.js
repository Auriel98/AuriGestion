const express = require("express");

const controller =
    require("../../controllers/employee/employee.controller");

const authenticate =
    require("../../middlewares/auth.middleware");

const requirePermission =
    require("../../middlewares/permission.middleware");

const router = express.Router();


router.get(
    "/stats",
    authenticate,
    requirePermission("employees", "view"),
    controller.getEmployeeStats
);


router.get(
    "/",
    authenticate,
    requirePermission("employees", "view"),
    controller.getEmployees
);


router.get(
    "/:id",
    authenticate,
    requirePermission("employees", "view"),
    controller.getEmployeeById
);


router.post(
    "/",
    authenticate,
    requirePermission("employees", "create"),
    controller.createEmployee
);


router.put(
    "/:id",
    authenticate,
    requirePermission("employees", "update"),
    controller.updateEmployee
);


router.patch(
    "/:id/status",
    authenticate,
    requirePermission("employees", "update"),
    controller.toggleEmployeeStatus
);


router.delete(
    "/:id",
    authenticate,
    requirePermission("employees", "delete"),
    controller.deleteEmployee
);


module.exports = router;