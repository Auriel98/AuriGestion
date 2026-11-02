import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { MoreHorizontal } from "lucide-react";

import { API_URL, API_ORIGIN } from "../../api/api";

import "./LatestEmployees.css";

// La base stocke un chemin relatif (/uploads/...) :
// on le préfixe avec l'adresse du backend.
const getPhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;

  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;

  return `${API_ORIGIN}${photoUrl}`;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getInitials = (firstName, lastName) =>
  `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toUpperCase() ||
  "?";

const LatestEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Vous devez vous connecter.");
        }

        const response = await fetch(
          `${API_URL}/dashboard/latest-employees`,
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
            result.message || "Impossible de récupérer les employés."
          );
        }

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(
            result.message || "Réponse inattendue du serveur."
          );
        }

        setEmployees(result.data);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement des derniers employés :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchEmployees();

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
        <div className="latest-employees-state" aria-busy="true">
          Chargement...
        </div>
      );
    }

    if (error) {
      return (
        <div className="latest-employees-state error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={handleRetry}>
            Réessayer
          </button>
        </div>
      );
    }

    if (employees.length === 0) {
      return (
        <div className="latest-employees-state">
          Aucun employé enregistré pour le moment.
        </div>
      );
    }

    return (
      <div className="latest-employees-table-wrapper">
        <table className="latest-employees-table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Poste</th>
              <th>Date d'embauche</th>
              <th aria-label="Actions" />
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => {
              const fullName =
                `${employee.first_name || ""} ${
                  employee.last_name || ""
                }`.trim() || "Sans nom";

              const photoUrl = getPhotoUrl(employee.photo_url);

              return (
                <tr key={employee.id}>
                  <td>
                    <div className="latest-employee-identity">
                      {photoUrl ? (
                        <img
                          className="latest-employee-avatar"
                          src={photoUrl}
                          alt=""
                        />
                      ) : (
                        <span className="latest-employee-avatar initials">
                          {getInitials(
                            employee.first_name,
                            employee.last_name
                          )}
                        </span>
                      )}

                      <span className="latest-employee-name">
                        {fullName}
                      </span>
                    </div>
                  </td>

                  <td className="latest-employee-position">
                    {employee.position || "-"}
                  </td>

                  <td className="latest-employee-date">
                    {formatDate(employee.hire_date)}
                  </td>

                  <td className="latest-employee-actions">
                    <button
                      type="button"
                      className="latest-employee-menu"
                      aria-label={`Actions pour ${fullName}`}
                    >
                      <MoreHorizontal />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section
      className="latest-employees"
      aria-labelledby="latest-employees-title"
    >
      <div className="latest-employees-header">
        <h2 className="latest-employees-title" id="latest-employees-title">
          Derniers employés ajoutés
        </h2>

        <Link to="/employees" className="latest-employees-link">
          Voir tout
        </Link>
      </div>

      {renderContent()}
    </section>
  );
};

export default LatestEmployees;