import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import MiniDashboard from "../../components/dashboard/MiniDashboard";
import "./PayrollSlips.css";

const months = [
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

const statusLabels = {
  draft: "Brouillon",
  calculated: "Calculé",
  validated: "Validé",
  paid: "Payé",
  cancelled: "Annulé",
};

export default function PayrollSlips() {
  const { periodId } = useParams();
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [slips, setSlips] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    calculated: 0,
    validated: 0,
    paid: 0,
  });

  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [periodData, slipsData, statsData] =
        await Promise.all([
          api.get(`/payroll/periods/${periodId}`),
          api.get(`/payroll/slips/period/${periodId}`),
          api.get(`/payroll/slips/period/${periodId}/stats`),
        ]);

      console.log("periodData:", periodData);

      setPeriod(periodData.period || periodData);

      setSlips(
        Array.isArray(slipsData)
          ? slipsData
          : slipsData.slips || []
      );

      setStats(
        statsData || {
          total: 0,
          draft: 0,
          calculated: 0,
          validated: 0,
          paid: 0,
        }
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Impossible de charger les bulletins."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodId]);

  const prepareSlips = async () => {
    if (
      !window.confirm(
        "Préparer les bulletins des employés sélectionnés ?"
      )
    ) {
      return;
    }

    try {
      setPreparing(true);
      setMessage("");

      const result = await api.post(
        `/payroll/slips/period/${periodId}/prepare`
      );

      await loadData();

      setMessage(
        result.message ||
          "Les bulletins ont été préparés."
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Impossible de préparer les bulletins."
      );
    } finally {
      setPreparing(false);
    }
  };

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("fr-FR");
  };

  if (loading) {
    return (
      <div className="payroll-slips-page">
        Chargement des bulletins...
      </div>
    );
  }

  if (!period) {
    return (
      <div className="payroll-slips-page">
        Période introuvable.
      </div>
    );
  }

  const monthName =
    months[Number(period.period_month) - 1];

  // Le bouton reste visible tant que la période
  // n'est pas explicitement dans un autre statut.
  const canPrepare =
    !period.status || period.status === "draft";

  // Compteur : on utilise ce que l'API renvoie,
  // sinon le nombre de bulletins, sinon "—".
  const rawCount =
    period.employee_count ?? period.employees_count;

  const employeeCountLabel =
    rawCount !== undefined && rawCount !== null
      ? `${Number(rawCount)} employé(s)`
      : slips.length > 0
      ? `${slips.length} employé(s)`
      : "— employé(s)";

  return (
    <div className="payroll-slips-page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <button
            className="back-button"
            onClick={() => navigate("/paie/periodes")}
          >
            ← Retour aux périodes
          </button>

          <h1>
            Bulletins — {monthName}{" "}
            {period.period_year}
          </h1>

          <p>
            {period.start_date} → {period.end_date}
          </p>
        </div>

        {canPrepare && (
          <button
            className="btn btn-primary"
            onClick={prepareSlips}
            disabled={preparing}
          >
            {preparing
              ? "Préparation..."
              : "Préparer les bulletins"}
          </button>
        )}
      </div>

      {message && (
        <div className="payroll-message">{message}</div>
      )}

      {/* MINI DASHBOARD */}

      <MiniDashboard
        stats={[
          {
            label: "Bulletins",
            value: stats.total || 0,
          },
          {
            label: "Brouillons",
            value: stats.draft || 0,
          },
          {
            label: "Calculés",
            value: stats.calculated || 0,
          },
          {
            label: "Validés",
            value: stats.validated || 0,
          },
          {
            label: "Payés",
            value: stats.paid || 0,
          },
        ]}
      />

      {/* LISTE */}

      <div className="slips-card">
        <div className="section-header">
          <div>
            <h2>Bulletins de la période</h2>

            <p>
              Les employés sont ajoutés manuellement à
              chaque période.
            </p>
          </div>

          <div className="employee-count">
            {employeeCountLabel}
          </div>
        </div>

        {slips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">$</div>

            <h3>Aucun bulletin préparé</h3>

            <p>
              Sélectionnez d'abord les employés dans la
              période puis préparez leurs bulletins.
            </p>

            {canPrepare && (
              <button
                className="btn btn-primary"
                onClick={prepareSlips}
                disabled={preparing}
              >
                {preparing
                  ? "Préparation..."
                  : "Préparer les bulletins"}
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Bulletin</th>
                  <th>Employé</th>
                  <th>Matricule</th>
                  <th>Salaire de base</th>
                  <th>Brut</th>
                  <th>Retenues</th>
                  <th>Net à payer</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {slips.map((slip) => (
                  <tr key={slip.id}>
                    <td>
                      <strong>{slip.slip_number}</strong>
                    </td>

                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">
                          {slip.photo_url ? (
                            <img
                              src={`${import.meta.env.VITE_API_ORIGIN}${slip.photo_url}`}
                              alt=""
                            />
                          ) : (
                            <>
                              {slip.first_name?.[0] || ""}
                              {slip.last_name?.[0] || ""}
                            </>
                          )}
                        </div>

                        <div>
                          <strong>
                            {slip.first_name}{" "}
                            {slip.last_name}
                          </strong>

                          <span>
                            {slip.position || "—"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{slip.matricule}</td>

                    <td>
                      {formatMoney(slip.base_salary)} FCFA
                    </td>

                    <td>
                      {formatMoney(slip.gross_salary)} FCFA
                    </td>

                    <td>
                      {formatMoney(
                        slip.employee_deductions
                      )}{" "}
                      FCFA
                    </td>

                    <td className="net-value">
                      {formatMoney(slip.net_to_pay)} FCFA
                    </td>

                    <td>
                      <span
                        className={`slip-status ${slip.status}`}
                      >
                        {statusLabels[slip.status] ||
                          slip.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="table-action"
                        onClick={() =>
                          navigate(
                            `/paie/bulletins/${slip.id}`
                          )
                        }
                      >
                        Ouvrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}