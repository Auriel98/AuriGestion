import { useEffect, useState } from "react";

import {
  Users,
  FileText,
  CalendarCheck,
  Wallet,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { API_URL } from "../../api/api";

import "./StatisticsCards.css";

const initialStatistics = {
  employees: 0,
  activeContracts: 0,
  todayAttendances: 0,
  payrollAmount: 0,
  // Optionnels : évolution du mois (null = non fournie par l'API)
  employeesGrowth: null,
  activeContractsGrowth: null,
  payrollGrowthPercent: null,
};

const cardsConfig = [
  {
    key: "employees",
    label: "Employés",
    icon: Users,
    color: "orange",
    growthKey: "employeesGrowth",
    growthType: "count",
  },
  {
    key: "activeContracts",
    label: "Contrats actifs",
    icon: FileText,
    color: "blue",
    growthKey: "activeContractsGrowth",
    growthType: "count",
  },
  {
    key: "todayAttendances",
    label: "Présences aujourd'hui",
    icon: CalendarCheck,
    color: "green",
    withProgress: true,
  },
  {
    key: "payrollAmount",
    label: "Masse salariale",
    icon: Wallet,
    color: "purple",
    currency: true,
    growthKey: "payrollGrowthPercent",
    growthType: "percent",
  },
];

const formatNumber = (value) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

const formatAmount = (amount) => `${formatNumber(amount)} FCFA`;

const formatGrowth = (value, type) => {
  const sign = value > 0 ? "+" : "";
  const suffix = type === "percent" ? "%" : "";
  return `${sign}${formatNumber(value)}${suffix} ce mois`;
};

const toOptionalNumber = (value) =>
  value === undefined || value === null || value === ""
    ? null
    : Number(value);

const StatisticsCards = () => {
  const [statistics, setStatistics] = useState(initialStatistics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError("");

        // Récupération du JWT utilisé par AuthContext
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error(
            "Vous devez vous connecter pour consulter les statistiques."
          );
        }

        const response = await fetch(`${API_URL}/dashboard/statistics`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              result.message ||
                "Votre session est invalide ou expirée. Veuillez vous reconnecter."
            );
          }

          if (response.status === 403) {
            throw new Error(
              result.message ||
                "Vous n'avez pas la permission de consulter ces statistiques."
            );
          }

          throw new Error(
            result.message || "Impossible de récupérer les statistiques."
          );
        }

        if (!result.success || !result.data) {
          throw new Error(
            result.message ||
              "Le serveur n'a pas retourné les statistiques attendues."
          );
        }

        const data = result.data;

        setStatistics({
          employees: Number(data.employees ?? 0),
          activeContracts: Number(data.activeContracts ?? 0),
          todayAttendances: Number(data.todayAttendances ?? 0),
          payrollAmount: Number(data.payrollAmount ?? 0),
          employeesGrowth: toOptionalNumber(data.employeesGrowth),
          activeContractsGrowth: toOptionalNumber(data.activeContractsGrowth),
          payrollGrowthPercent: toOptionalNumber(data.payrollGrowthPercent),
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement des statistiques :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchStatistics();

    return () => {
      controller.abort();
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((count) => count + 1);
  };

  if (loading) {
    return (
      <div className="statistics-loading" aria-busy="true">
        {cardsConfig.map((card) => (
          <div className="statistics-loading-card" key={card.key} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="statistics-error" role="alert">
        <span>{error}</span>

        <button type="button" onClick={handleRetry}>
          Réessayer
        </button>
      </div>
    );
  }

  const attendanceRate =
    statistics.employees > 0
      ? Math.min(
          100,
          Math.round((statistics.todayAttendances / statistics.employees) * 100)
        )
      : 0;

  return (
    <div className="statistics-cards">
      {cardsConfig.map((card) => {
        const Icon = card.icon;
        const value = statistics[card.key];
        const growth = card.growthKey ? statistics[card.growthKey] : null;
        const hasGrowth = growth !== null && growth !== undefined;
        const isNegative = hasGrowth && growth < 0;
        const TrendIcon = isNegative ? ArrowDown : ArrowUp;

        return (
          <article className="statistic-card" key={card.key}>
            <div className={`statistic-card-icon ${card.color}`}>
              <Icon />
            </div>

            <div className="statistic-card-content">
              <p className="statistic-card-label">{card.label}</p>

              <p
                className={`statistic-card-value ${
                  card.currency ? "currency" : ""
                }`}
              >
                {card.currency ? formatAmount(value) : formatNumber(value)}
              </p>

              {hasGrowth && (
                <div
                  className={`statistic-card-trend ${
                    isNegative ? "negative" : ""
                  }`}
                >
                  <TrendIcon />
                  <span>{formatGrowth(growth, card.growthType)}</span>
                </div>
              )}

              {card.withProgress && (
                <span className="statistic-card-subtitle">
                  sur {formatNumber(statistics.employees)} employés
                </span>
              )}
            </div>

            {card.withProgress && (
              <div
                className="statistic-card-progress"
                style={{ "--progress": `${attendanceRate}%` }}
                role="img"
                aria-label={`Taux de présence : ${attendanceRate}%`}
              >
                <span>{attendanceRate}%</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};

export default StatisticsCards;