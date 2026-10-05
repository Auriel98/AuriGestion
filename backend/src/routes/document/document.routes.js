const express = require("express");

const controller =
    require("../../controllers/document/document.controller");

const authenticate =
    require("../../middlewares/auth.middleware");

const requirePermission =
    require("../../middlewares/permission.middleware");

const {
    uploadEmployeeDocument,
} = require("../../middlewares/upload.middleware");


const router = express.Router();


/* =====================================================
   DOCUMENTS D'UN EMPLOYÉ
===================================================== */

router.get(
    "/employee/:employeeId",

    authenticate,

    requirePermission(
        "employee_documents",
        "view"
    ),

    controller.getEmployeeDocuments
);


/* =====================================================
   AJOUTER UN DOCUMENT
===================================================== */

router.post(
    "/",

    authenticate,

    requirePermission(
        "employee_documents",
        "create"
    ),

    uploadEmployeeDocument.single(
        "document"
    ),

    controller.createDocument
);


/* =====================================================
   SUPPRIMER UN DOCUMENT
===================================================== */

router.delete(
    "/:id",

    authenticate,

    requirePermission(
        "employee_documents",
        "delete"
    ),

    controller.deleteDocument
);


module.exports = router;