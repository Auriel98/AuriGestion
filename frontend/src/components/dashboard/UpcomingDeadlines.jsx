import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ChevronRight } from "lucide-react";

import "./UpcomingDeadlines.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

// Les chemins correspondent aux routes déclarées dans AppRouter
const DEADLINE_TYPES = {
  contract_end: {
    title: "Échéance contrat",
    color: "blue",
    path: "/contracts",
  },
  document_expiry: {
    title: "Expiration document",
    color: "orange",
    path: "/employees",
  },
  payroll_period_end: {
    title: "Fin de période de paie",
    color: "purple",
    path: "/paie/periodes", // corrigé (avant : /payroll/periods)
  },
};

const DEFAULT_TYPE = {
  title: "Échéance",
  color: "orange",
  path: "/",
};

// dueDate arrive au format "YYYY-MM-DD" : on évite tout décalage de fuseau
const parseDueDate = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) {
    return { day: "-", month: "" };
  }

  return {
    day: String(day).padStart(2, "0"),
    month: MONTH_LABELS[month - 1] || "",
  };
};

// "2026-10" -> "Octobre 2026"
const formatPeriodLabel = (label) => {
  const [year, month] = String(label || "").split("-").map(Number);

  if (!year || !month) {
    return "";
  }

  return `${MONTH_NAMES[month - 1] || ""} ${year}`.trim();
};

const getFullName = (item) =>
  `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Sans nom";

const getSubtitle = (item) => {
  switch (item.type) {
    case "contract_end":
      return ["Contrat", item.label, getFullName(item)]
        .filter(Boolean)
        .join(" - ");

    case "document_expiry":
      return ["Document", item.label, getFullName(item)]
        .filter(Boolean)
        .join(" - ");

    case "payroll_period_end":
      return `Période : ${formatPeriodLabel(item.label)}`;

    default:
      return item.label || "";
  }
};

const UpcomingDeadlines = () => {
  const navigate = useNavigate();

  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDeadlines = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Vous devez vous connecter.");
        }

        const response = await fetch(
          `${API_URL}/dashboard/upcoming-deadlines`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Impossible de récupérer les échéances."
          );
        }

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(
            result.message || "Réponse inattendue du serveur."
          );
        }

        setDeadlines(result.data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement des échéances :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDeadlines();

    return () => {
      controller.abort();
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((count) => count + 1);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="deadlines-state" aria-busy="true">
          Chargement...
        </div>
      );
    }

    if (error) {
      return (
        <div className="deadlines-state error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={handleRetry}>
            Réessayer
          </button>
        </div>
      );
    }

    if (deadlines.length === 0) {
      return (
        <div className="deadlines-state">
          Aucune échéance dans les 30 prochains jours.
        </div>
      );
    }

    return (
      <ul className="deadlines-list">
        {deadlines.map((item) => {
          const config = DEADLINE_TYPES[item.type] || DEFAULT_TYPE;
          const { day, month } = parseDueDate(item.dueDate);

          return (
            <li key={`${item.type}-${item.id}`}>
              <button
                type="button"
                className="deadline-item"
                onClick={() => navigate(config.path)}
              >
                <span className={`deadline-date ${config.color}`}>
                  <strong>{day}</strong>
                  <span>{month}</span>
                </span>

                <span className="deadline-text">
                  <span className="deadline-title">{config.title}</span>
                  <span className="deadline-subtitle">
                    {getSubtitle(item)}
                  </span>
                </span>

                <ChevronRight className="deadline-arrow" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section
      className="upcoming-deadlines"
      aria-labelledby="upcoming-deadlines-title"
    >
      <div className="deadlines-header">
        <h2 className="deadlines-title" id="upcoming-deadlines-title">
          Prochaines échéances
        </h2>
      </div>

      {renderContent()}
    </section>
  );
};

export default UpcomingDeadlines;