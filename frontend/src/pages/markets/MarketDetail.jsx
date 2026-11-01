import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  CreditCard,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";

import api from "../../api/api";
import "./MarketDetail.css";

const STATUS_LABELS = {
  draft: "Brouillon",
  active: "Actif",
  completed: "Terminé",
  suspended: "Suspendu",
  cancelled: "Annulé",
};

const STATUS_CLASSES = {
  draft: "market-detail-status-draft",
  active: "market-detail-status-active",
  completed: "market-detail-status-completed",
  suspended: "market-detail-status-suspended",
  cancelled: "market-detail-status-cancelled",
};

const MOVEMENT_LABELS = {
  initial: "Budget initial",
  increase: "Augmentation",
  decrease: "Diminution",
};

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("fr-FR");
};

const emptyMovement = {
  movement_type: "increase",
  amount: "",
  movement_date: "",
  reference: "",
  reason: "",
};

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showMovementModal, setShowMovementModal] =
    useState(false);

  const [movementForm, setMovementForm] =
    useState(emptyMovement);

  const [savingMovement, setSavingMovement] =
    useState(false);

  /**
   * =====================================================
   * CHARGER LE MARCHÉ
   * =====================================================
   */

  const loadMarket = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/markets/${id}`);

      setMarket(response);
    } catch (error) {
      console.error(
        "Erreur chargement marché :",
        error
      );

      alert(
        error.message ||
          "Impossible de charger le marché."
      );

      navigate("/marches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarket();
  }, [id]);

  /**
   * =====================================================
   * MOUVEMENTS BUDGÉTAIRES
   * =====================================================
   */

  const handleMovementChange = (event) => {
    const { name, value } = event.target;

    setMovementForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openMovementModal = () => {
    setMovementForm({
      ...emptyMovement,
      movement_date: new Date()
        .toISOString()
        .substring(0, 10),
    });

    setShowMovementModal(true);
  };

  const closeMovementModal = () => {
    if (savingMovement) return;

    setShowMovementModal(false);
    setMovementForm(emptyMovement);
  };

  const handleMovementSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(movementForm.amount || 0);

    if (!amount || amount <= 0) {
      alert("Le montant doit être supérieur à 0.");
      return;
    }

    try {
      setSavingMovement(true);

      await api.post(
        `/markets/${id}/budget-movements`,
        {
          movement_type:
            movementForm.movement_type,

          amount,

          movement_date:
            movementForm.movement_date || null,

          reference:
            movementForm.reference || null,

          reason:
            movementForm.reason || null,
        }
      );

      closeMovementModal();

      await loadMarket();
    } catch (error) {
      console.error(
        "Erreur mouvement budget :",
        error
      );

      alert(
        error.message ||
          "Impossible d'ajouter le mouvement."
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const handleDeleteMovement = async (movement) => {
    const confirmed = window.confirm(
      "Voulez-vous supprimer ce mouvement budgétaire ?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/markets/budget-movements/${movement.id}`
      );

      await loadMarket();
    } catch (error) {
      console.error(
        "Erreur suppression mouvement :",
        error
      );

      alert(
        error.message ||
          "Impossible de supprimer le mouvement."
      );
    }
  };

  /**
   * =====================================================
   * CHARGEMENT
   * =====================================================
   */

  if (loading) {
    return (
      <div className="market-detail-page">
        <div className="market-detail-loading">
          Chargement du marché...
        </div>
      </div>
    );
  }

  if (!market) {
    return null;
  }

  const budget = market.budget_summary || {};
  const financial =
    market.financial_summary || {};

  return (
    <div className="market-detail-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="market-detail-header">

        <button
          className="market-back-button"
          onClick={() => navigate("/marches")}
        >
          <ArrowLeft size={18} />
          Retour aux marchés
        </button>

        <div className="market-detail-header-main">

          <div className="market-detail-heading">

            <div className="market-detail-icon">
              <BriefcaseBusiness size={24} />
            </div>

            <div>
              <div className="market-detail-number">
                {market.market_number}
              </div>

              <h1>{market.title}</h1>

              <p>
                {market.client_name}
              </p>
            </div>

          </div>

          <div
            className={`market-detail-status ${
              STATUS_CLASSES[market.status] || ""
            }`}
          >
            {STATUS_LABELS[market.status] ||
              market.status}
          </div>

        </div>
      </div>

      {/* =================================================
          INFORMATIONS
      ================================================= */}

      <div className="market-info-card">

        <div className="market-info-item">

          <span>Client</span>

          <strong>
            {market.client_name}
          </strong>

          {market.client_email && (
            <small>
              {market.client_email}
            </small>
          )}

          {market.client_phone && (
            <small>
              {market.client_phone}
            </small>
          )}

        </div>

        <div className="market-info-item">

          <span>Montant du contrat</span>

          <strong>
            {formatMoney(
              market.contract_amount
            )}
          </strong>

        </div>

        <div className="market-info-item">

          <span>Période</span>

          <strong>
            {formatDate(
              market.start_date
            )}
            {" → "}
            {formatDate(
              market.end_date
            )}
          </strong>

        </div>

        <div className="market-info-item">

          <span>Devis lié</span>

          <strong>
            {market.quote_number || "Aucun"}
          </strong>

        </div>

      </div>

      {/* =================================================
          KPI FINANCIERS
      ================================================= */}

      <div className="market-kpi-grid">

        <div className="market-kpi-card">

          <div className="market-kpi-icon">
            <Wallet size={20} />
          </div>

          <div>
            <span>Budget</span>

            <strong>
              {formatMoney(budget.budget)}
            </strong>
          </div>

        </div>

        <div className="market-kpi-card">

          <div className="market-kpi-icon">
            <TrendingDown size={20} />
          </div>

          <div>
            <span>Dépenses</span>

            <strong>
              {formatMoney(budget.spent)}
            </strong>
          </div>

        </div>

        <div className="market-kpi-card">

          <div className="market-kpi-icon">
            <Wallet size={20} />
          </div>

          <div>
            <span>Budget disponible</span>

            <strong>
              {formatMoney(budget.available)}
            </strong>
          </div>

        </div>

        <div className="market-kpi-card">

          <div className="market-kpi-icon">
            <Receipt size={20} />
          </div>

          <div>
            <span>Facturé</span>

            <strong>
              {formatMoney(financial.billed)}
            </strong>
          </div>

        </div>

        <div className="market-kpi-card">

          <div className="market-kpi-icon">
            <CreditCard size={20} />
          </div>

          <div>
            <span>Encaissé</span>

            <strong>
              {formatMoney(financial.collected)}
            </strong>
          </div>

        </div>

        <div className="market-kpi-card">

          <div className="market-kpi-icon">
            <TrendingUp size={20} />
          </div>

          <div>
            <span>Rentabilité</span>

            <strong>
              {formatMoney(
                financial.profitability
              )}
            </strong>
          </div>

        </div>

      </div>

      {/* =================================================
          CONTENU
      ================================================= */}

      <div className="market-detail-columns">

        {/* ===============================================
            COLONNE GAUCHE
        =============================================== */}

        <div className="market-detail-main">

          {/* BUDGET */}

          <section className="market-section">

            <div className="market-section-header">

              <div>
                <h2>Budget du marché</h2>

                <p>
                  Suivi des mouvements budgétaires.
                </p>
              </div>

              <button
                className="market-primary-button"
                onClick={openMovementModal}
              >
                <Plus size={17} />
                Mouvement
              </button>

            </div>

            <div className="market-budget-summary">

              <div>
                <span>Initial</span>
                <strong>
                  {formatMoney(
                    budget.initial
                  )}
                </strong>
              </div>

              <div>
                <span>Augmentations</span>
                <strong className="positive">
                  +{" "}
                  {formatMoney(
                    budget.increases
                  )}
                </strong>
              </div>

              <div>
                <span>Diminutions</span>
                <strong className="negative">
                  -{" "}
                  {formatMoney(
                    budget.decreases
                  )}
                </strong>
              </div>

              <div>
                <span>Disponible</span>
                <strong>
                  {formatMoney(
                    budget.available
                  )}
                </strong>
              </div>

            </div>

            <div className="market-table-wrapper">

              <table className="market-table">

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Référence</th>
                    <th>Motif</th>
                    <th>Montant</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>

                  {(!market.movements ||
                    market.movements.length === 0) ? (

                    <tr>
                      <td
                        colSpan="6"
                        className="market-table-empty"
                      >
                        Aucun mouvement budgétaire.
                      </td>
                    </tr>

                  ) : (

                    market.movements.map(
                      (movement) => (

                        <tr key={movement.id}>

                          <td>
                            {formatDate(
                              movement.movement_date
                            )}
                          </td>

                          <td>
                            <span
                              className={`movement-type movement-${movement.movement_type}`}
                            >
                              {MOVEMENT_LABELS[
                                movement.movement_type
                              ]}
                            </span>
                          </td>

                          <td>
                            {movement.reference ||
                              "—"}
                          </td>

                          <td>
                            {movement.reason ||
                              "—"}
                          </td>

                          <td>

                            <strong
                              className={
                                movement.movement_type ===
                                  "decrease"
                                  ? "negative"
                                  : "positive"
                              }
                            >
                              {movement.movement_type ===
                              "decrease"
                                ? "- "
                                : "+ "}

                              {formatMoney(
                                movement.amount
                              )}
                            </strong>

                          </td>

                          <td>

                            <button
                              className="market-table-delete"
                              onClick={() =>
                                handleDeleteMovement(
                                  movement
                                )
                              }
                              title="Supprimer"
                            >
                              <Trash2 size={16} />
                            </button>

                          </td>

                        </tr>

                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

          {/* DEPENSES */}

          <section className="market-section">

            <div className="market-section-header">

              <div>
                <h2>Dépenses</h2>

                <p>
                  Dépenses rattachées à ce marché.
                </p>
              </div>

              <button
                className="market-secondary-button"
                onClick={() =>
                  navigate("/depenses")
                }
              >
                Voir les dépenses
              </button>

            </div>

            <div className="market-table-wrapper">

              <table className="market-table">

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Référence</th>
                    <th>Description</th>
                    <th>Fournisseur</th>
                    <th>Statut</th>
                    <th>Montant</th>
                  </tr>
                </thead>

                <tbody>

                  {(!market.expenses ||
                    market.expenses.length === 0) ? (

                    <tr>
                      <td
                        colSpan="6"
                        className="market-table-empty"
                      >
                        Aucune dépense liée à ce marché.
                      </td>
                    </tr>

                  ) : (

                    market.expenses.map(
                      (expense) => (

                        <tr key={expense.id}>

                          <td>
                            {formatDate(
                              expense.expense_date
                            )}
                          </td>

                          <td>
                            {expense.expense_number}
                          </td>

                          <td>
                            {expense.description}
                          </td>

                          <td>
                            {expense.supplier_name ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`expense-status expense-${expense.status}`}
                            >
                              {expense.status}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                expense.amount
                              )}
                            </strong>
                          </td>

                        </tr>

                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>

        {/* ===============================================
            COLONNE DROITE
        =============================================== */}

        <div className="market-detail-side">

          {/* FACTURES */}

          <section className="market-section">

            <div className="market-section-header compact">

              <div>
                <h2>Factures</h2>

                <p>
                  Facturation du marché.
                </p>
              </div>

              <Receipt size={20} />

            </div>

            <div className="market-side-total">

              <span>Total facturé</span>

              <strong>
                {formatMoney(
                  financial.billed
                )}
              </strong>

            </div>

            <div className="market-side-total">

              <span>Encaissé</span>

              <strong className="positive">
                {formatMoney(
                  financial.collected
                )}
              </strong>

            </div>

            <div className="market-side-total">

              <span>Reste à encaisser</span>

              <strong className="negative">
                {formatMoney(
                  financial.outstanding
                )}
              </strong>

            </div>

            <div className="market-invoice-list">

              {(!market.invoices ||
                market.invoices.length === 0) ? (

                <div className="market-side-empty">
                  Aucune facture.
                </div>

              ) : (

                market.invoices.map(
                  (invoice) => (

                    <div
                      className="market-invoice-item"
                      key={invoice.id}
                    >

                      <div>

                        <strong>
                          {invoice.invoice_number}
                        </strong>

                        <span>
                          {formatDate(
                            invoice.issue_date
                          )}
                        </span>

                      </div>

                      <div>

                        <strong>
                          {formatMoney(
                            invoice.total
                          )}
                        </strong>

                        <span>
                          {invoice.status}
                        </span>

                      </div>

                    </div>

                  )
                )
              )}

            </div>

            <button
              className="market-secondary-button full"
              onClick={() =>
                navigate("/factures")
              }
            >
              Voir les factures
            </button>

          </section>

          {/* DESCRIPTION */}

          <section className="market-section">

            <div className="market-section-header compact">

              <div>
                <h2>Description</h2>
              </div>

              <Pencil size={18} />

            </div>

            <div className="market-description">

              {market.description ? (
                <p>{market.description}</p>
              ) : (
                <span>
                  Aucune description.
                </span>
              )}

            </div>

            {market.notes && (
              <div className="market-notes">

                <strong>Notes</strong>

                <p>
                  {market.notes}
                </p>

              </div>
            )}

          </section>

        </div>

      </div>

      {/* =================================================
          MODAL MOUVEMENT
      ================================================= */}

      {showMovementModal && (

        <div
          className="market-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeMovementModal();
            }
          }}
        >

          <div className="market-modal">

            <div className="market-modal-header">

              <div>
                <h2>
                  Nouveau mouvement budgétaire
                </h2>

                <p>
                  Ajoutez une modification au budget
                  du marché.
                </p>
              </div>

              <button
                className="market-modal-close"
                onClick={closeMovementModal}
              >
                ×
              </button>

            </div>

            <form
              className="market-form"
              onSubmit={handleMovementSubmit}
            >

              <div className="market-form-group">

                <label>Type *</label>

                <select
                  name="movement_type"
                  value={
                    movementForm.movement_type
                  }
                  onChange={handleMovementChange}
                >
                  <option value="increase">
                    Augmentation
                  </option>

                  <option value="decrease">
                    Diminution
                  </option>
                </select>

              </div>

              <div className="market-form-group">

                <label>Montant *</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  name="amount"
                  value={
                    movementForm.amount
                  }
                  onChange={handleMovementChange}
                  placeholder="Ex : 500000"
                  required
                />

              </div>

              <div className="market-form-group">

                <label>Date</label>

                <input
                  type="date"
                  name="movement_date"
                  value={
                    movementForm.movement_date
                  }
                  onChange={handleMovementChange}
                />

              </div>

              <div className="market-form-group">

                <label>Référence</label>

                <input
                  type="text"
                  name="reference"
                  value={
                    movementForm.reference
                  }
                  onChange={handleMovementChange}
                  placeholder="Ex : Avenant N°1"
                />

              </div>

              <div className="market-form-group">

                <label>Motif</label>

                <textarea
                  name="reason"
                  value={
                    movementForm.reason
                  }
                  onChange={handleMovementChange}
                  rows="3"
                  placeholder="Motif du mouvement..."
                />

              </div>

              <div className="market-form-footer">

                <button
                  type="button"
                  className="market-secondary-button"
                  onClick={closeMovementModal}
                  disabled={savingMovement}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="market-primary-button"
                  disabled={savingMovement}
                >
                  {savingMovement
                    ? "Enregistrement..."
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