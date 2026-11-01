const dashboardService = require("../../service/dashboard/dashboardService");

/**
 * Récupère les statistiques du tableau de bord.
 */
const getStatistics = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Entreprise non identifiée.",
      });
    }

    const statistics = await dashboardService.getStatistics(companyId);

    return res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des statistiques :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les statistiques.",
    });
  }
};

/**
 * Récupère les derniers employés ajoutés.
 */
const getLatestEmployees = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Entreprise non identifiée.",
      });
    }

    const employees = await dashboardService.getLatestEmployees(companyId);

    return res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des derniers employés :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les derniers employés.",
    });
  }
};

/**
 * Récupère la répartition des employés actifs par service.
 */
const getEmployeesByDepartment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Entreprise non identifiée.",
      });
    }

    const departments = await dashboardService.getEmployeesByDepartment(
      companyId
    );

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la répartition par service :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer la répartition par service.",
    });
  }
};

/**
 * Récupère l'évolution mensuelle des effectifs et des contrats.
 */
const getWorkforceEvolution = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Entreprise non identifiée.",
      });
    }

    const evolution = await dashboardService.getWorkforceEvolution(companyId);

    return res.status(200).json({
      success: true,
      data: evolution,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'évolution des effectifs :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer l'évolution des effectifs.",
    });
  }
};

/**
 * Récupère les prochaines échéances.
 */
const getUpcomingDeadlines = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Entreprise non identifiée.",
      });
    }

    const deadlines = await dashboardService.getUpcomingDeadlines(companyId);

    return res.status(200).json({
      success: true,
      data: deadlines,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des prochaines échéances :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les prochaines échéances.",
    });
  }
};

/**
 * Récupère les dernières activités.
 */
const getLatestActivities = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise.",
      });
    }

    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Entreprise non identifiée.",
      });
    }

    const activities = await dashboardService.getLatestActivities(companyId);

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des dernières activités :",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les dernières activités.",
    });
  }
};

// Exportation des fonctions du contrôleur
module.exports = {
  getStatistics,
  getLatestEmployees,
  getEmployeesByDepartment,
  getWorkforceEvolution,
  getUpcomingDeadlines,
  getLatestActivities,
};