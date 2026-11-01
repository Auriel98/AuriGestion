const express = require("express");

const dashboardController = require("../../controllers/dashboard/dashboardController");
const authenticate = require("../../middlewares/auth.middleware");

const router = express.Router();

// Récupérer les statistiques du tableau de bord
router.get(
  "/statistics",
  authenticate,
  dashboardController.getStatistics
);

// Récupérer les 5 derniers employés ajoutés
router.get(
  "/latest-employees",
  authenticate,
  dashboardController.getLatestEmployees
);

// Récupérer la répartition des employés actifs par service
router.get(
  "/employees-by-department",
  authenticate,
  dashboardController.getEmployeesByDepartment
);

// Récupérer l'évolution mensuelle des effectifs et des contrats
router.get(
  "/workforce-evolution",
  authenticate,
  dashboardController.getWorkforceEvolution
);

// Récupérer les prochaines échéances
router.get(
  "/upcoming-deadlines",
  authenticate,
  dashboardController.getUpcomingDeadlines
);

// Récupérer les dernières activités
router.get(
  "/latest-activities",
  authenticate,
  dashboardController.getLatestActivities
);

module.exports = router;