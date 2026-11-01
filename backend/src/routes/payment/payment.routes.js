const express = require("express");

const {
  getInvoicePayments,
  createInvoicePayment,
  deleteInvoicePayment,
} = require("../../controllers/payment/payment.controller");

const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/invoices/:invoiceId/payments",
  getInvoicePayments
);

router.post(
  "/invoices/:invoiceId/payments",
  createInvoicePayment
);

router.delete(
  "/invoice-payments/:id",
  deleteInvoicePayment
);

module.exports = router;