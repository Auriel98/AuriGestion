const express = require("express");

const router = express.Router();

const {
    getClientStats,
    getClients,
    getClientById,
    createClient,
    updateClient,
    toggleClientStatus,
    deleteClient,
} = require("../../controllers/client/client.controller");

const authenticate = require("../../middlewares/auth.middleware");

// =====================================================
// CLIENTS
// =====================================================

router.get("/stats", authenticate, getClientStats);

router.get("/", authenticate, getClients);

router.get("/:id", authenticate, getClientById);

router.post("/", authenticate, createClient);

router.put("/:id", authenticate, updateClient);

router.patch(
    "/:id/status",
    authenticate,
    toggleClientStatus
);

router.delete(
    "/:id",
    authenticate,
    deleteClient
);

module.exports = router;