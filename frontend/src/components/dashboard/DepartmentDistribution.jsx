import { useEffect, useState } from "react";

import "./DepartmentDistribution.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

// Couleurs dans l'ordre : 4 services principaux + "Autres"
const COLORS = ["#ff7900", "#1d8cf8", "#19b57f", "#8b5cf6", "#9aa9c2"];
const MAX_VISIBLE = 4;

// Garde les 4 plus gros services et regroupe le reste dans "Autres"
const groupDepartments = (departments) => {
  const sorted = [...departments].sort((a, b) => b.count - a.count);

  const main = sorted.slice(0, MAX_VISIBLE);
  const othersCount = sorted
    .slice(MAX_VISIBLE)
    .reduce((sum, item) => sum + item.count, 0);

  return othersCount > 0
    ? [...main, { department: "Autres", count: othersCount }]
    : main;
};

const DepartmentDistribution = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Vous devez vous connecter.");
        }

        const response = await fetch(
          `${API_URL}/dashboard/employees-by-department`,
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
            result.message || "Impossible de récupérer la répartition."
          );
        }

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(
            result.message || "Réponse inattendue du serveur."
          );
        }

        setDepartments(
          result.data.map((item) => ({
            department: item.department,
            count: Number(item.count ?? 0),
          }))
        );
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement de la répartition :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDepartments();

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
        <div className="department-state" aria-busy="true">
          Chargement...
        </div>
      );
    }

    if (error) {
      return (
        <div className="department-state error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={handleRetry}>
            Réessayer
          </button>
        </div>
      );
    }

    const grouped = groupDepartments(departments);
    const total = grouped.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) {
      return (
        <div className="department-state">
          Aucun employé actif pour le moment.
        </div>
      );
    }

    // Construction du dégradé conique du donut
    let cumulative = 0;

    const stops = grouped.map((item, index) => {
      const start = (cumulative / total) * 100;
      cumulative += item.count;
      const end = (cumulative / total) * 100;

      return `${COLORS[index]} ${start}% ${end}%`;
    });

    return (
      <div className="department-content">
        <div
          className="department-donut"
          style={{ background: `conic-gradient(${stops.join(", ")})` }}
          role="img"
          aria-label={`Répartition de ${total} employés par service`}
        >
          <div className="department-donut-center">
            <strong>{total}</strong>
            <span>Employés</span>
          </div>
        </div>

        <ul className="department-legend">
          {grouped.map((item, index) => {
            const percent = Math.round((item.count / total) * 100);

            return (
              <li className="department-legend-item" key={item.department}>
                <span
                  className="department-legend-dot"
                  style={{ background: COLORS[index] }}
                />

                <span className="department-legend-name">
                  {item.department}
                </span>

                <span className="department-legend-value">
                  {item.count} ({percent}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <section
      className="department-distribution"
      aria-labelledby="department-distribution-title"
    >
      <h2
        className="department-distribution-title"
        id="department-distribution-title"
      >
        Répartition des employés par service
      </h2>

      {renderContent()}
    </section>
  );
};

export default DepartmentDistribution;