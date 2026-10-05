import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  Pencil,
  Plus,
  Printer,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

import api from "../../api/api";
import MiniDashboard from "../../components/dashboard/MiniDashboard";
import "./PayrollSlipDetail.css";

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const statusLabel = {
  draft: "Brouillon",
  calculated: "Calculé",
  validated: "Validé",
  paid: "Payé",
  cancelled: "Annulé",
};

const emptyForm = {
  component_id: "",
  designation: "",
  code: "",
  category: "earning",
  quantity: 1,
  base_amount: 0,
  rate: "",
  calculation_mode: "manual",
  notes: "",
};

export default function PayrollSlipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [slip, setSlip] = useState(null);
  const [lines, setLines] = useState([]);
  const [components, setComponents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);

      const [slipResponse, linesResponse, componentsResponse] =
        await Promise.all([
          api.get(`/payroll/slips/${id}`),
          api.get(`/payroll/slips/${id}/lines`),
          api.get("/payroll/components"),
        ]);

      setSlip(slipResponse.slip || slipResponse);
      setLines(linesResponse.lines || linesResponse || []);
      setComponents(
        componentsResponse.components || componentsResponse || []
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "Impossible de charger le bulletin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const isEditable = slip?.status === "draft";

  const gains = lines.filter(
    (line) => line.category === "earning"
  );

  const deductions = lines.filter(
    (line) =>
      line.category === "deduction" ||
      line.category === "tax"
  );

  const employerContributions = lines.filter(
    (line) => line.category === "employer_contribution"
  );

  const openAddModal = (category) => {
    setEditingLine(null);

    setForm({
      ...emptyForm,
      category,
    });

    setShowModal(true);
  };

  const openEditModal = (line) => {
    if (line.origin === "system") return;

    setEditingLine(line);

    setForm({
      component_id: line.component_id || "",
      designation: line.designation || "",
      code: line.code || "",
      category: line.category || "earning",
      quantity: line.quantity || 1,
      base_amount: line.base_amount || 0,
      rate: line.rate ?? "",
      calculation_mode: line.calculation_mode || "manual",
      notes: line.notes || "",
    });

    setShowModal(true);
  };

  const handleComponentChange = (componentId) => {
    const component = components.find(
      (item) => item.id === componentId
    );

    if (!component) {
      setForm((prev) => ({
        ...prev,
        component_id: componentId,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      component_id: component.id,
      designation: component.name,
      code: component.code,
      category:
        component.category === "deduction"
          ? "deduction"
          : component.category === "earning"
          ? "earning"
          : prev.category,
      calculation_mode:
        component.calculation_method === "percentage"
          ? "quantity_rate"
          : component.calculation_method === "fixed"
          ? "fixed"
          : component.calculation_method === "manual"
          ? "manual"
          : prev.calculation_mode,
      base_amount: component.fixed_amount || 0,
      rate: component.rate ?? "",
    }));
  };

  const saveLine = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        component_id: form.component_id || null,
        designation: form.designation,
        code: form.code,
        category: form.category,
        quantity: Number(form.quantity || 1),
        base_amount: Number(form.base_amount || 0),
        rate:
          form.rate === "" || form.rate === null
            ? null
            : Number(form.rate),
        calculation_mode: form.calculation_mode,
        notes: form.notes || null,
      };

      if (editingLine) {
        await api.put(
          `/payroll/slips/${id}/lines/${editingLine.id}`,
          payload
        );
      } else {
        await api.post(`/payroll/slips/${id}/lines`, payload);
      }

      setShowModal(false);
      setEditingLine(null);
      setForm(emptyForm);

      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const deleteLine = async (line) => {
    if (line.origin === "system") return;

    const confirmed = window.confirm(
      `Supprimer "${line.designation}" ?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/payroll/slips/${id}/lines/${line.id}`
      );

      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message || "Impossible de supprimer la ligne");
    }
  };

  const calculateSlip = async () => {
    try {
      setCalculating(true);

      await api.post(`/payroll/slips/${id}/calculate`);

      await loadData();
    } catch (error) {
      console.error(error);
      alert(error.message || "Erreur lors du calcul du bulletin");
    } finally {
      setCalculating(false);
    }
  };

  /*
   * Ouvre la page d'impression dédiée (bulletin A4),
   * qui déclenche ensuite window.print().
   */
  const printSlip = () => {
    navigate(`/paie/bulletins/${id}/imprimer`);
  };

  if (loading) {
    return (
      <div className="payroll-slip-page">
        <div className="payroll-slip-loading">
          Chargement du bulletin...
        </div>
      </div>
    );
  }

  if (!slip) {
    return (
      <div className="payroll-slip-page">
        <div className="payroll-slip-empty">
          Bulletin introuvable.
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-slip-page">

      {/* HEADER */}
      <div className="payroll-slip-header no-print">
        <div>
          <button
            className="back-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            Retour
          </button>

          <h1>Bulletin de paie</h1>

          <p>
            {slip.slip_number} ·{" "}
            <span className={`status status-${slip.status}`}>
              {statusLabel[slip.status] || slip.status}
            </span>
          </p>
        </div>

        <div className="payroll-slip-actions">
          {isEditable && (
            <button
              className="secondary-button"
              onClick={calculateSlip}
              disabled={calculating}
            >
              <Calculator size={18} />
              {calculating ? "Calcul..." : "Calculer"}
            </button>
          )}

          <button
            className="secondary-button"
            onClick={printSlip}
          >
            <Printer size={18} />
            Imprimer
          </button>
        </div>
      </div>

      {/* EMPLOYEE */}
      <section className="employee-card">

        <div className="employee-profile">

          {slip.photo_url ? (
            <img
              src={`${import.meta.env.VITE_API_ORIGIN}${slip.photo_url}`}
              alt=""
              className="employee-photo"
            />
          ) : (
            <div className="employee-photo employee-photo-empty">
              <User size={28} />
            </div>
          )}

          <div>
            <h2>
              {slip.first_name} {slip.last_name}
            </h2>

            <p>
              {slip.position || "Poste non renseigné"}
            </p>
          </div>
        </div>

        <div className="employee-info">

          <div>
            <span>Matricule</span>
            <strong>{slip.matricule || "-"}</strong>
          </div>

          <div>
            <span>Période</span>
            <strong>
              {slip.period_month}/{slip.period_year}
            </strong>
          </div>

          <div>
            <span>Contrat</span>
            <strong>
              {slip.contract_type || "—"}
            </strong>
          </div>

        </div>

      </section>

      {/* MINI DASHBOARD */}
      <MiniDashboard
        stats={[
          {
            title: "Salaire de base",
            value: `${formatMoney(slip.base_salary)} FCFA`,
            icon: Wallet,
          },
          {
            title: "Brut",
            value: `${formatMoney(slip.gross_salary)} FCFA`,
            icon: Wallet,
          },
          {
            title: "Retenues",
            value: `${formatMoney(
              slip.employee_deductions
            )} FCFA`,
            icon: Wallet,
          },
          {
            title: "Net à payer",
            value: `${formatMoney(slip.net_to_pay)} FCFA`,
            icon: Wallet,
          },
        ]}
      />

      {/* BULLETIN */}
      <div className="payslip-paper">

        {/* GAINS */}
        <section className="payslip-section">

          <div className="section-title">
            <div>
              <h3>Gains</h3>
              <span>Éléments constituant le salaire brut</span>
            </div>

            {isEditable && (
              <button
                className="add-line-button no-print"
                onClick={() => openAddModal("earning")}
              >
                <Plus size={17} />
                Ajouter
              </button>
            )}
          </div>

          <LineTable
            lines={gains}
            editable={isEditable}
            onEdit={openEditModal}
            onDelete={deleteLine}
          />

          <div className="total-row">
            <span>Total brut</span>
            <strong>
              {formatMoney(slip.gross_salary)} FCFA
            </strong>
          </div>

        </section>

        {/* RETENUES */}
        <section className="payslip-section">

          <div className="section-title">
            <div>
              <h3>Retenues</h3>
              <span>
                Cotisations, taxes et retenues manuelles
              </span>
            </div>

            {isEditable && (
              <button
                className="add-line-button no-print"
                onClick={() => openAddModal("deduction")}
              >
                <Plus size={17} />
                Ajouter
              </button>
            )}
          </div>

          <LineTable
            lines={deductions}
            editable={isEditable}
            onEdit={openEditModal}
            onDelete={deleteLine}
          />

          <div className="total-row">
            <span>Total retenues</span>
            <strong>
              {formatMoney(
                slip.employee_deductions
              )}{" "}
              FCFA
            </strong>
          </div>

        </section>

        {/* EMPLOYEUR */}
        {employerContributions.length > 0 && (
          <section className="payslip-section employer-section">

            <div className="section-title">
              <div>
                <h3>Charges patronales</h3>
                <span>
                  Contributions prises en charge par
                  l'employeur
                </span>
              </div>
            </div>

            <LineTable
              lines={employerContributions}
              editable={false}
              onEdit={openEditModal}
              onDelete={deleteLine}
            />

            <div className="total-row">
              <span>Total charges patronales</span>
              <strong>
                {formatMoney(
                  slip.employer_contributions
                )}{" "}
                FCFA
              </strong>
            </div>

          </section>
        )}

        {/* NET */}
        <section className="net-section">

          <div>
            <span>Net à payer</span>
            <small>
              Montant effectivement versé au salarié
            </small>
          </div>

          <strong>
            {formatMoney(slip.net_to_pay)} FCFA
          </strong>

        </section>

      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="modal-overlay no-print"
          onMouseDown={() => setShowModal(false)}
        >
          <div
            className="payroll-line-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">
              <div>
                <h2>
                  {editingLine
                    ? "Modifier la ligne"
                    : "Ajouter une ligne"}
                </h2>

                <p>
                  Cette ligne sera contrôlée
                  manuellement.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveLine}>

              <div className="form-group">
                <label>Composant</label>

                <select
                  value={form.component_id}
                  onChange={(event) =>
                    handleComponentChange(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Sélectionner un composant
                  </option>

                  {components
                    .filter(
                      (component) =>
                        component.category ===
                          "earning" ||
                        component.category ===
                          "deduction"
                    )
                    .map((component) => (
                      <option
                        key={component.id}
                        value={component.id}
                      >
                        {component.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-grid">

                <div className="form-group">
                  <label>Désignation</label>
                  <input
                    value={form.designation}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        designation:
                          event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Code</label>
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        code: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-grid">

                <div className="form-group">
                  <label>Catégorie</label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category:
                          event.target.value,
                      }))
                    }
                  >
                    <option value="earning">
                      Gain
                    </option>

                    <option value="deduction">
                      Retenue
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mode de calcul</label>

                  <select
                    value={form.calculation_mode}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        calculation_mode:
                          event.target.value,
                      }))
                    }
                  >
                    <option value="manual">
                      Manuel
                    </option>

                    <option value="fixed">
                      Montant fixe
                    </option>

                    <option value="quantity_rate">
                      Quantité × taux
                    </option>

                    <option value="days">
                      Nombre de jours
                    </option>
                  </select>
                </div>

              </div>

              <div className="form-grid">

                <div className="form-group">
                  <label>Quantité</label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity:
                          event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Montant de base</label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.base_amount}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        base_amount:
                          event.target.value,
                      }))
                    }
                  />
                </div>

              </div>

              <div className="form-group">
                <label>Taux (%)</label>

                <input
                  type="number"
                  step="0.0001"
                  value={form.rate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      rate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Note</label>

                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingLine
                    ? "Modifier"
                    : "Ajouter"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}


/* =====================================================
   TABLEAU DES LIGNES
===================================================== */

function LineTable({
  lines,
  editable,
  onEdit,
  onDelete,
}) {
  if (!lines.length) {
    return (
      <div className="empty-lines">
        Aucune ligne.
      </div>
    );
  }

  return (
    <div className="line-table-wrapper">

      <table className="line-table">

        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
            <th>Base</th>
            <th>Taux</th>
            <th>Montant</th>
            {editable && (
              <th className="no-print">Actions</th>
            )}
          </tr>
        </thead>

        <tbody>

          {lines.map((line) => {

            const amount =
              Number(line.gain || 0) ||
              Number(line.deduction || 0) ||
              Number(line.employer_amount || 0);

            return (
              <tr key={line.id}>

                <td>
                  <div className="line-designation">
                    <strong>
                      {line.designation}
                    </strong>

                    {line.origin === "system" && (
                      <span className="system-badge">
                        Automatique
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  {Number(line.quantity || 0)}
                </td>

                <td>
                  {formatMoney(line.base_amount)}
                </td>

                <td>
                  {line.rate !== null &&
                  line.rate !== undefined
                    ? `${line.rate}%`
                    : "—"}
                </td>

                <td className="amount-cell">
                  {formatMoney(amount)} FCFA
                </td>

                {editable && (
                  <td className="line-actions no-print">

                    {line.origin !== "system" && (
                      <>
                        <button
                          onClick={() =>
                            onEdit(line)
                          }
                          title="Modifier"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() =>
                            onDelete(line)
                          }
                          title="Supprimer"
                          className="danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}

                  </td>
                )}

              </tr>
            );
          })}

        </tbody>

      </table>

    </div>
  );
}