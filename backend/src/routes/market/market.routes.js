const express = require("express");

const {
  getMarketStats,
  getMarkets,
  getMarketById,
  createMarket,
  updateMarket,
  updateMarketStatus,
  deleteMarket,

  getBudgetMovements,
  createBudgetMovement,
  deleteBudgetMovement,
} = require("../../controllers/market/market.controller");

const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

/**
 * Toutes les routes nécessitent une authentification
 */
router.use(authenticate);

/**
 * =========================================================
 * MARCHÉS
 * =========================================================
 */

// Statistiques
router.get("/stats", getMarketStats);

// Liste
router.get("/", getMarkets);

// Détail
router.get("/:id", getMarketById);

// Création
router.post("/", createMarket);

// Modification
router.put("/:id", updateMarket);

// Changement de statut
router.patch("/:id/status", updateMarketStatus);

// Suppression
router.delete("/:id", deleteMarket);


/**
 * =========================================================
 * BUDGET DES MARCHÉS
 * =========================================================
 */

// Liste des mouvements budgétaires d'un marché
router.get(
  "/:marketId/budget-movements",
  getBudgetMovements
);

// Ajouter un mouvement budgétaire
router.post(
  "/:marketId/budget-movements",
  createBudgetMovement
);

// Supprimer un mouvement budgétaire
router.delete(
  "/budget-movements/:id",
  deleteBudgetMovement
);

module.exports = router;