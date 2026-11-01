
const express = require("express");

const {
  getBudgetDashboard,
  getMarketProfitability,
} = require("../../controllers/budget/budget.controller");

const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/dashboard", getBudgetDashboard);
router.get("/rentabilite", getMarketProfitability);

module.exports = router;