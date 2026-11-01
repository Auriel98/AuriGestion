const express = require("express");

const {
  getInvoiceStats,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} = require("../../controllers/invoice/invoice.controller");

const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/stats", getInvoiceStats);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);

router.post("/", createInvoice);

router.put("/:id", updateInvoice);

router.patch("/:id/status", updateInvoiceStatus);

router.delete("/:id", deleteInvoice);

module.exports = router;