import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import MiniDashboard from "../../components/dashboard/MiniDashboard";
import "./PayrollPeriods.css";

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
  calculated: "Calculée",
  validated: "Validée",
  paid: "Payée",
  cancelled: "Annulée",
};

/*
 * Formate une date en YYYY-MM-DD en heure locale
 * (toISOString() décalerait la date d'un jour hors UTC).
 */
const toLocalDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;

const getMonthStart = (year, month) =>
  toLocalDate(new Date(year, month - 1, 1));

const getMonthEnd = (year, month) =>
  toLocalDate(new Date(year, month, 0));

export default function PayrollPeriods() {
  const navigate = useNavigate();

  const [periods, setPeriods] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    calculated: 0,
    paid: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const currentDate = new Date();

  const [form, setForm] = useState({
    period_year: currentDate.getFullYear(),
    period_month: currentDate.getMonth() + 1,
    start_date: getMonthStart(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1
    ),
    end_date: getMonthEnd(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1
    ),
  });

  const loadPeriods = async () => {
    try {
      setLoading(true);

      const [periodsData, statsData] = await Promise.all([
        api.get("/payroll/periods"),
        api.get("/payroll/periods/stats"),
      ]);

      setPeriods(
        Array.isArray(periodsData)
          ? periodsData
          : periodsData.periods || []
      );

      setStats(
        statsData || {
          total: 0,
          draft: 0,
          calculated: 0,
          paid: 0,
        }
      );
    } catch (error) {
      setMessage(
        error.message || "Impossible de charger les périodes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const updateMonth = (month) => {
    const year = Number(form.period_year);
    const monthNumber = Number(month);

    setForm({
      ...form,
      period_month: monthNumber,
      start_date: getMonthStart(year, monthNumber),
      end_date: getMonthEnd(year, monthNumber),
    });
  };

  const createPeriod = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      await api.post("/payroll/periods", {
        period_year: Number(form.period_year),
        period_month: Number(form.period_month),
        start_date: form.start_date,
        end_date: form.end_date,
      });

      setShowModal(false);
      await loadPeriods();

      setMessage("Période créée avec succès.");
    } catch (error) {
      setMessage(error.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const openEmployees = async (period) => {
    try {
      setSaving(true);
      setSelectedPeriod(period);

      const data = await api.get(
        `/payroll/periods/${period.id}/employees`
      );

      const list = Array.isArray(data)
        ? data
        : data.employees || [];

      setEmployees(list);

      setSelectedEmployees(
        list
          .filter((employee) => employee.selected)
          .map((employee) => employee.id)
      );

      setShowEmployees(true);
    } catch (error) {
      setMessage(
        error.message ||
          "Impossible de charger les employés."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees((current) => {
      if (current.includes(employeeId)) {
        return current.filter((id) => id !== employeeId);
      }

      return [...current, employeeId];
    });
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(
      employees.map((employee) => employee.id)
    );
  };

  const clearEmployees = () => {
    setSelectedEmployees([]);
  };

  const saveEmployees = async () => {
    try {
      setSaving(true);

      await api.put(
        `/payroll/periods/${selectedPeriod.id}/employees`,
        {
          employee_ids: selectedEmployees,
        }
      );

      setShowEmployees(false);

      await loadPeriods();

      setMessage(
        `${selectedEmployees.length} employé(s) sélectionné(s).`
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Erreur lors de la sélection des employés."
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePeriod = async (period) => {
    if (
      !window.confirm(
        `Supprimer la période ${months[period.period_month - 1]} ${period.period_year} ?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/payroll/periods/${period.id}`);

      await loadPeriods();

      setMessage("Période supprimée.");
    } catch (error) {
      setMessage(
        error.message || "Impossible de supprimer la période."
      );
    }
  };

  const changeStatus = async (period, status) => {
    try {
      await api.patch(
        `/payroll/periods/${period.id}/status`,
        { status }
      );

      await loadPeriods();

      setMessage("Statut de la période mis à jour.");
    } catch (error) {
      setMessage(
        error.message ||
          "Impossible de modifier le statut."
      );
    }
  };

  if (loading) {
    return (
      <div className="payroll-periods-page">
        Chargement des périodes...
      </div>
    );
  }

  return (
    <div className="payroll-periods-page">

      <div className="page-header">
        <div>
          <h1>Périodes de paie</h1>
          <p>
            Gérez les périodes et choisissez manuellement les
            employés à rémunérer.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Nouvelle période
        </button>
      </div>

      {message && (
        <div className="payroll-message">
          {message}
        </div>
      )}

      <MiniDashboard
        stats={[
          {
            label: "Périodes",
            value: stats.total || 0,
          },
          {
            label: "Brouillons",
            value: stats.draft || 0,
          },
          {
            label: "Calculées",
            value: stats.calculated || 0,
          },
          {
            label: "Payées",
            value: stats.paid || 0,
          },
        ]}
      />

      <div className="periods-card">

        <div className="section-header">
          <div>
            <h2>Historique des périodes</h2>
            <p>
              Chaque période possède sa propre sélection
              d'employés.
            </p>
          </div>
        </div>

        <div className="table-wrapper">

          <table>

            <thead>
              <tr>
                <th>Période</th>
                <th>Dates</th>
                <th>Employés</th>
                <th>Bulletins</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {periods.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">
                    Aucune période de paie.
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id}>

                    <td>
                      <strong>
                        {months[period.period_month - 1]}{" "}
                        {period.period_year}
                      </strong>
                    </td>

                    <td>
                      {period.start_date} →{" "}
                      {period.end_date}
                    </td>

                    <td>
                      {period.employee_count ?? 0}
                    </td>

                    <td>
                      {period.slip_count ?? 0}
                    </td>

                    <td>
                      <span
                        className={`period-status ${period.status}`}
                      >
                        {statusLabels[period.status] ||
                          period.status}
                      </span>
                    </td>

                    <td>

                      {/* Gérer les employés de la période */}
                      {period.status === "draft" && (
                        <button
                          className="table-action"
                          onClick={() => openEmployees(period)}
                        >
                          Employés
                        </button>
                      )}

                      {/* Accéder aux bulletins */}
                      <button
                        className="table-action"
                        onClick={() =>
                          navigate(
                            `/paie/periodes/${period.id}/bulletins`
                          )
                        }
                      >
                        Bulletins
                      </button>

                      {/* Supprimer uniquement une période brouillon */}
                      {period.status === "draft" && (
                        <button
                          className="table-action danger"
                          onClick={() => deletePeriod(period)}
                        >
                          Supprimer
                        </button>
                      )}

                      {/* Valider */}
                      {period.status === "calculated" && (
                        <button
                          className="table-action"
                          onClick={() =>
                            changeStatus(period, "validated")
                          }
                        >
                          Valider
                        </button>
                      )}

                      {/* Marquer comme payée */}
                      {period.status === "validated" && (
                        <button
                          className="table-action"
                          onClick={() =>
                            changeStatus(period, "paid")
                          }
                        >
                          Marquer payée
                        </button>
                      )}

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* CREATION PERIODE */}

      {showModal && (
        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">
              <div>
                <h2>Nouvelle période de paie</h2>
                <p>
                  Créez une période avant de sélectionner
                  les employés.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={createPeriod}>

              <div className="form-grid">

                <div className="form-group">
                  <label>Année</label>

                  <input
                    type="number"
                    value={form.period_year}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        period_year: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Mois</label>

                  <select
                    value={form.period_month}
                    onChange={(e) =>
                      updateMonth(e.target.value)
                    }
                  >
                    {months.map((month, index) => (
                      <option
                        key={month}
                        value={index + 1}
                      >
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date de début</label>

                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        start_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Date de fin</label>

                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        end_date: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Annuler
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                >
                  Créer la période
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* SELECTION EMPLOYES */}

      {showEmployees && (
        <div className="modal-overlay">

          <div className="modal employee-selection-modal">

            <div className="modal-header">

              <div>
                <h2>
                  Sélection des employés
                </h2>

                <p>
                  {months[
                    selectedPeriod.period_month - 1
                  ]}{" "}
                  {selectedPeriod.period_year}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowEmployees(false)
                }
              >
                ×
              </button>

            </div>

            <div className="selection-toolbar">

              <strong>
                {selectedEmployees.length} sélectionné(s)
              </strong>

              <div>
                <button
                  className="table-action"
                  onClick={selectAllEmployees}
                >
                  Tout sélectionner
                </button>

                <button
                  className="table-action"
                  onClick={clearEmployees}
                >
                  Tout retirer
                </button>
              </div>

            </div>

            <div className="employee-list">

              {employees.map((employee) => (

                <label
                  key={employee.id}
                  className={
                    selectedEmployees.includes(
                      employee.id
                    )
                      ? "employee-option selected"
                      : "employee-option"
                  }
                >

                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(
                      employee.id
                    )}
                    onChange={() =>
                      toggleEmployee(employee.id)
                    }
                  />

                  <div className="employee-avatar">

                    {employee.photo_url ? (
                      <img
                        src={
                          `${import.meta.env.VITE_API_ORIGIN}${employee.photo_url}`
                        }
                        alt=""
                      />
                    ) : (
                      `${employee.first_name?.[0] || ""}${
                        employee.last_name?.[0] || ""
                      }`
                    )}

                  </div>

                  <div className="employee-info">

                    <strong>
                      {employee.first_name}{" "}
                      {employee.last_name}
                    </strong>

                    <span>
                      {employee.matricule}
                    </span>

                  </div>

                  <div className="employee-position">
                    {employee.position || "—"}
                  </div>

                </label>

              ))}

            </div>

            <div className="modal-actions">

              <button
                className="btn btn-secondary"
                onClick={() =>
                  setShowEmployees(false)
                }
              >
                Annuler
              </button>

              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={saveEmployees}
              >
                Enregistrer la sélection
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}