import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Pencil,
  CheckCircle2,
  Ban,
  Receipt,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileText,
} from "lucide-react";

import api from "../../api/api";
import "./ExpenseDetail.css";

const statusLabels = {
  draft: "Brouillon",
  validated: "Validée",
  cancelled: "Annulée",
};

const paymentLabels = {
  cash: "Espèces",
  bank_transfer: "Virement bancaire",
  mobile_money: "Mobile Money",
  cheque: "Chèque",
  other: "Autre",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0)) + " FCFA";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function ExpenseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadExpense = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/expenses/${id}`);

      setExpense(response.data);
    } catch (error) {
      console.error("Erreur chargement dépense:", error);

      alert(
        error?.message ||
          "Impossible de charger cette dépense."
      );

      navigate("/depenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
  }, [id]);

  const updateStatus = async (status) => {
    const message =
      status === "validated"
        ? "Voulez-vous valider cette dépense ?"
        : "Voulez-vous annuler cette dépense ?";

    if (!window.confirm(message)) return;

    try {
      await api.patch(`/expenses/${id}/status`, {
        status,
      });

      await loadExpense();
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Impossible de modifier le statut."
      );
    }
  };

  if (loading) {
    return (
      <div className="expense-detail-loading">
        Chargement de la dépense...
      </div>
    );
  }

  if (!expense) {
    return null;
  }

  return (
    <div className="expense-detail-page">
      {/* HEADER */}
      <div className="expense-detail-header">
        <div className="expense-detail-heading">
          <button
            className="expense-back-button"
            onClick={() => navigate("/depenses")}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="expense-detail-title-row">
              <h1>{expense.expense_number}</h1>

              <span
                className={`expense-detail-status ${expense.status}`}
              >
                {statusLabels[expense.status] ||
                  expense.status}
              </span>
            </div>

            <p>
              Détail de la dépense
            </p>
          </div>
        </div>

        <div className="expense-detail-actions">
          {expense.status === "draft" && (
            <>
              <button
                className="expense-detail-button secondary"
                onClick={() =>
                  navigate(`/depenses?edit=${expense.id}`)
                }
              >
                <Pencil size={17} />
                Modifier
              </button>

              <button
                className="expense-detail-button success"
                onClick={() =>
                  updateStatus("validated")
                }
              >
                <CheckCircle2 size={17} />
                Valider
              </button>
            </>
          )}

          {expense.status === "validated" && (
            <button
              className="expense-detail-button danger"
              onClick={() =>
                updateStatus("cancelled")
              }
            >
              <Ban size={17} />
              Annuler
            </button>
          )}

          <button
            className="expense-detail-button secondary"
            onClick={() => window.print()}
          >
            <Printer size={17} />
            Imprimer
          </button>
        </div>
      </div>

      {/* DOCUMENT */}
      <div className="expense-document">
        {/* DOCUMENT HEADER */}
        <div className="expense-document-header">
          <div className="expense-company-block">
            <div className="expense-company-logo">
              A
            </div>

            <div>
              <h2>AuriGestion</h2>
              <span>
                Gestion administrative et financière
              </span>
            </div>
          </div>

          <div className="expense-document-number">
            <span>DÉPENSE</span>
            <strong>{expense.expense_number}</strong>
          </div>
        </div>

        {/* MAIN AMOUNT */}
        <div className="expense-main-amount">
          <span>Montant de la dépense</span>

          <strong>
            {formatMoney(expense.amount)}
          </strong>
        </div>

        {/* INFORMATIONS */}
        <div className="expense-info-grid">
          <div className="expense-info-card">
            <div className="expense-info-icon">
              <CalendarDays size={19} />
            </div>

            <div>
              <span>Date de dépense</span>
              <strong>
                {formatDate(expense.expense_date)}
              </strong>
            </div>
          </div>

          <div className="expense-info-card">
            <div className="expense-info-icon">
              <CreditCard size={19} />
            </div>

            <div>
              <span>Mode de paiement</span>
              <strong>
                {paymentLabels[
                  expense.payment_method
                ] ||
                  expense.payment_method ||
                  "-"}
              </strong>
            </div>
          </div>

          <div className="expense-info-card">
            <div className="expense-info-icon">
              <Receipt size={19} />
            </div>

            <div>
              <span>Catégorie</span>
              <strong>
                {expense.category_name ||
                  "Non classée"}
              </strong>
            </div>
          </div>

          <div className="expense-info-card">
            <div className="expense-info-icon">
              <Building2 size={19} />
            </div>

            <div>
              <span>Fournisseur</span>
              <strong>
                {expense.supplier_name ||
                  "Non renseigné"}
              </strong>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <section className="expense-document-section">
          <div className="expense-section-title">
            <FileText size={18} />
            <h3>Description</h3>
          </div>

          <div className="expense-description-box">
            {expense.description}
          </div>
        </section>

        {/* MARCHÉ */}
        <section className="expense-document-section">
          <div className="expense-section-title">
            <BriefcaseBusiness size={18} />
            <h3>Marché concerné</h3>
          </div>

          {expense.market_id ? (
            <div className="expense-market-box">
              <div>
                <span>Marché</span>
                <strong>
                  {expense.market_number}
                </strong>
              </div>

              <div>
                <span>Projet</span>
                <strong>
                  {expense.market_title}
                </strong>
              </div>

              <div>
                <span>Client</span>
                <strong>
                  {expense.client_name || "-"}
                </strong>
              </div>
            </div>
          ) : (
            <div className="expense-general-box">
              Cette dépense est une dépense générale.
              Elle n'est rattachée à aucun marché.
            </div>
          )}
        </section>

        {/* PAIEMENT */}
        <section className="expense-document-section">
          <div className="expense-section-title">
            <CreditCard size={18} />
            <h3>Informations de paiement</h3>
          </div>

          <div className="expense-payment-box">
            <div>
              <span>Mode</span>
              <strong>
                {paymentLabels[
                  expense.payment_method
                ] ||
                  expense.payment_method ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>Référence</span>
              <strong>
                {expense.payment_reference ||
                  "Aucune référence"}
              </strong>
            </div>

            <div>
              <span>Montant</span>
              <strong>
                {formatMoney(expense.amount)}
              </strong>
            </div>
          </div>
        </section>

        {/* JUSTIFICATIF */}
        {expense.receipt_url && (
          <section className="expense-document-section">
            <div className="expense-section-title">
              <Receipt size={18} />
              <h3>Justificatif</h3>
            </div>

            <a
              href={expense.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="expense-receipt-link"
            >
              Consulter le justificatif
            </a>
          </section>
        )}

        {/* NOTES */}
        {expense.notes && (
          <section className="expense-document-section">
            <div className="expense-section-title">
              <FileText size={18} />
              <h3>Notes</h3>
            </div>

            <div className="expense-notes">
              {expense.notes}
            </div>
          </section>
        )}

        {/* SIGNATURE */}
        <div className="expense-signatures">
          <div>
            <span>Établi par</span>
            <div className="expense-signature-line" />
          </div>

          <div>
            <span>Validé par</span>
            <div className="expense-signature-line" />
          </div>
        </div>

        <div className="expense-document-footer">
          Document généré par AuriGestion
        </div>
      </div>
    </div>
  );
}