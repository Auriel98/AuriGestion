const express = require("express");

const {
  getQuoteStats,
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
} = require("../../controllers/quote/quote.controller");

const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/stats", getQuoteStats);

router.get("/", getQuotes);

router.get("/:id", getQuoteById);

router.post("/", createQuote);

router.put("/:id", updateQuote);

router.patch("/:id/status", updateQuoteStatus);

router.delete("/:id", deleteQuote);

module.exports = router;