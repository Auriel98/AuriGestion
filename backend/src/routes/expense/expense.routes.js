const express = require("express");

const {
  getExpenseStats,
  getExpenseCategories,
  createExpenseCategory,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  updateExpenseStatus,
  deleteExpense,
} = require("../../controllers/expense/expense.controller");

const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);

// Statistiques
router.get("/stats", getExpenseStats);

// Catégories
router.get("/categories", getExpenseCategories);
router.post("/categories", createExpenseCategory);

// Dépenses
router.get("/", getExpenses);
router.get("/:id", getExpenseById);

router.post("/", createExpense);
router.put("/:id", updateExpense);

router.patch("/:id/status", updateExpenseStatus);

router.delete("/:id", deleteExpense);

module.exports = router;