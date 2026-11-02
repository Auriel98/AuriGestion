import { useEffect, useState } from "react";

import {
  Users,
  FileText,
  ReceiptText,
  FilePlus2,
  CreditCard,
  Activity,
} from "lucide-react";

import { API_URL } from "../../api/api";

import "./RecentActivities.css";

// Un type inconnu utilise DEFAULT_TYPE : aucune erreur
const ACTIVITY_TYPES = {
  employee_created: { icon: Users, color: "green" },
  contract_created: { icon: FileText, color: "blue" },
  payslip_generated: { icon: ReceiptText, color: "purple" },
  quote_created: { icon: FilePlus2, color: "orange" },
  payment_received: { icon: CreditCard, color: "green" },
};

const DEFAULT_TYPE = { icon: Activity, color: "orange" };

// Ex : "Il y a 2 h", "Il y a 1 j"
const formatRelativeTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const RecentActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Vous devez vous connecter.");
        }

        const response = await fetch(
          `${API_URL}/dashboard/latest-activities`,
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
            result.message || "Impossible de récupérer les activités."
          );
        }

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(
            result.message || "Réponse inattendue du serveur."
          );
        }

        setActivities(result.data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement des activités :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();

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
        <div className="activities-state" aria-busy="true">
          Chargement...
        </div>
      );
    }

    if (error) {
      return (
        <div className="activities-state error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={handleRetry}>
            Réessayer
          </button>
        </div>
      );
    }

    if (activities.length === 0) {
      return (
        <div className="activities-state">
          Aucune activité pour le moment.
        </div>
      );
    }

    return (
      <ul className="activities-list">
        {activities.map((activity) => {
          const config = ACTIVITY_TYPES[activity.type] || DEFAULT_TYPE;
          const Icon = config.icon;

          const details = [
            activity.description,
            activity.userName && `par ${activity.userName}`,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li className="activity-item" key={activity.id}>
              <span className={`activity-icon ${config.color}`}>
                <Icon />
              </span>

              <span className="activity-text">
                <span className="activity-title">{activity.title}</span>

                {details && (
                  <span className="activity-description">{details}</span>
                )}
              </span>

              <span className="activity-time">
                {formatRelativeTime(activity.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section
      className="recent-activities"
      aria-labelledby="recent-activities-title"
    >
      <h2 className="activities-title" id="recent-activities-title">
        Dernières activités
      </h2>

      {renderContent()}
    </section>
  );
};

export default RecentActivities;