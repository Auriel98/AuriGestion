import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Send,
  Ban,
  Building2,
  Download,
  User,
  Calendar,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import api, { API_ORIGIN } from "../../api/api";
import "./InvoiceDetail.css";

const STATUS_LABELS = {
  draft: "Brouillon",
  issued: "Émise",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  cancelled: "Annulée",
};

const STATUS_CLASS = {
  draft: "invoice-detail-status-draft",
  issued: "invoice-detail-status-issued",
  partially_paid: "invoice-detail-status-partial",
  paid: "invoice-detail-status-paid",
  cancelled: "invoice-detail-status-cancelled",
};

const paymentMethodLabels = {
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
  }).format(Number(value) || 0) + " FCFA";

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("fr-FR");
};

const today = () => new Date().toISOString().split("T")[0];

const emptyPaymentForm = () => ({
  payment_date: today(),
  amount: "",
  payment_method: "cash",
  reference: "",
  notes: "",
});

// Même appel que dans Company.jsx, compatible avec api("/company") et api.get("/company")
const fetchCompany = () =>
  typeof api.get === "function"
    ? api.get("/company")
    : api("/company");

// Totaux affichés : brut -> remise -> HT -> taxes -> TTC
// Calculés à partir des lignes pour rester cohérents quel que soit
// le sens donné à invoice.subtotal côté backend.
const computeDisplayTotals = (invoice) => {
  const items = invoice?.items || [];

  if (items.length === 0) {
    const discount = Number(invoice?.discount_amount) || 0;
    const net = Number(invoice?.subtotal) || 0;

    return {
      gross: net + discount,
      discount,
      net,
      tax: Number(invoice?.tax_amount) || 0,
      total: Number(invoice?.total_amount) || 0,
    };
  }

  let gross = 0;
  let discount = 0;

  items.forEach((item) => {
    gross += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    discount += Number(item.discount_amount) || 0;
  });

  return {
    gross,
    discount,
    net: gross - discount,
    tax: Number(invoice.tax_amount) || 0,
    total: Number(invoice.total_amount) || 0,
  };
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Paiements
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({
    total_amount: 0,
    amount_paid: 0,
    remaining_amount: 0,
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm());
  const [paymentLoading, setPaymentLoading] = useState(false);

  const documentRef = useRef(null);

  useEffect(() => {
    loadInvoice();
    loadPayments();
  }, [id]);

  useEffect(() => {
    loadCompany();
  }, []);

  // showLoader = false : rechargement silencieux (après un paiement)
  const loadInvoice = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const data = await api.get(`/invoices/${id}`);

      setInvoice(
        data.invoice
          ? {
              ...data.invoice,
              items: data.items || data.invoice.items,
            }
          : data
      );
    } catch (error) {
      console.error(error);

      alert(error.message || "Impossible de charger la facture.");

      navigate("/factures");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadPayments = async () => {
    if (!id) return;

    try {
      const data = await api.get(`/invoices/${id}/payments`);

      setPayments(data.payments || []);

      setPaymentSummary({
        total_amount: Number(data.total_amount || 0),
        amount_paid: Number(data.amount_paid || 0),
        remaining_amount: Number(data.remaining_amount || 0),
      });
    } catch (error) {
      console.error("Erreur chargement paiements:", error);
    }
  };

  // Si le chargement échoue, la facture s'affiche quand même
  const loadCompany = async () => {
    try {
      const data = await fetchCompany();

      setCompany(data?.company || data);
    } catch (error) {
      console.error("Erreur chargement entreprise :", error);
    }
  };

  const changeStatus = async (status) => {
    try {
      await api.patch(`/invoices/${id}/status`, {
        status,
      });

      await loadInvoice(false);
      await loadPayments();
    } catch (error) {
      alert(
        error.message || "Impossible de modifier le statut de la facture."
      );
    }
  };

  const editInvoice = () => {
    navigate(`/factures?edit=${invoice.id}`);
  };

  const openPaymentModal = () => {
    setPaymentForm(emptyPaymentForm());
    setShowPaymentModal(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();

    const amount = Number(paymentForm.amount);

    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    if (amount > paymentSummary.remaining_amount) {
      alert(
        `Le montant dépasse le reste à payer de ${formatMoney(
          paymentSummary.remaining_amount
        )}.`
      );
      return;
    }

    try {
      setPaymentLoading(true);

      await api.post(`/invoices/${id}/payments`, {
        payment_date: paymentForm.payment_date,
        amount,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });

      // Le backend est la source de vérité : on recharge tout
      await loadPayments();
      await loadInvoice(false);

      setPaymentForm(emptyPaymentForm());
      setShowPaymentModal(false);
    } catch (error) {
      console.error(error);
      alert(error.message || "Impossible d'enregistrer le paiement.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce paiement ?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/invoice-payments/${paymentId}`);

      await loadPayments();
      await loadInvoice(false);
    } catch (error) {
      console.error(error);
      alert(error.message || "Impossible de supprimer le paiement.");
    }
  };

  // Génère un PDF A4 du document et le télécharge
  const downloadPdf = async () => {
    const element = documentRef.current;

    if (!element) return;

    try {
      setDownloading(true);

      // Mise en page A4 pendant la capture
      element.classList.add("pdf-mode");

      // Laisse le navigateur appliquer la mise en page
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { default: html2pdf } = await import("html2pdf.js");

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${invoice.invoice_number || "facture"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            // Fenêtre large : évite les media queries mobiles
            windowWidth: 1200,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(element)
        .save();
    } catch (error) {
      console.error(error);

      alert("Impossible de générer le PDF.");
    } finally {
      element.classList.remove("pdf-mode");
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="invoice-detail-loading">
        Chargement de la facture...
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const remaining =
    Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0);

  const canAddPayment =
    ["issued", "partially_paid"].includes(invoice.status) &&
    paymentSummary.remaining_amount > 0;

  const totals = computeDisplayTotals(invoice);

  const logoSrc = company?.logo_url
    ? `${API_ORIGIN}${company.logo_url}`
    : null;

  const legalIds = [
    company?.nif && `NIF : ${company.nif}`,
    company?.rccm && `RCCM : ${company.rccm}`,
    company?.cnss && `CNSS : ${company.cnss}`,
  ].filter(Boolean);

  return (
    <div className="invoice-detail-page">
      {/* HEADER APPLICATION (écran uniquement) */}
      <div className="invoice-detail-header">
        <button
          className="invoice-back-button"
          onClick={() => navigate("/factures")}
        >
          <ArrowLeft size={18} />
          Retour aux factures
        </button>

        <div className="invoice-detail-actions">
          {invoice.status === "draft" && (
            <>
              <button
                className="invoice-action-secondary"
                onClick={editInvoice}
              >
                <Pencil size={17} />
                Modifier
              </button>

              <button
                className="invoice-action-primary"
                onClick={() => changeStatus("issued")}
              >
                <Send size={17} />
                Émettre
              </button>
            </>
          )}

          {canAddPayment && (
            <button
              className="invoice-action-primary"
              onClick={openPaymentModal}
            >
              <Plus size={17} />
              Ajouter un paiement
            </button>
          )}

          {invoice.status === "issued" && (
            <button
              className="invoice-action-danger"
              onClick={() => changeStatus("cancelled")}
            >
              <Ban size={17} />
              Annuler
            </button>
          )}

          <button
            className="invoice-action-secondary"
            onClick={downloadPdf}
            disabled={downloading}
          >
            <Download size={17} />
            {downloading ? "Génération..." : "Télécharger"}
          </button>

          <button
            className="invoice-action-secondary"
            onClick={() => window.print()}
          >
            <Printer size={17} />
            Imprimer
          </button>
        </div>
      </div>

      {/* DOCUMENT */}
      <div className="invoice-document" ref={documentRef}>
        {/* EN-TÊTE : ENTREPRISE + FACTURE */}
        <div className="invoice-document-header">
          <div className="invoice-company">
            <div className="invoice-company-logo">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  crossOrigin="anonymous"
                  alt="Logo de l'entreprise"
                />
              ) : (
                <Building2 size={34} />
              )}
            </div>

            <div className="invoice-company-info">
              <h1>{company?.name || "Entreprise"}</h1>

              {company?.legal_name && <span>{company.legal_name}</span>}

              {company?.address && <span>{company.address}</span>}

              {company?.phone && <span>Tél : {company.phone}</span>}

              {company?.email && <span>{company.email}</span>}

              {legalIds.length > 0 && <small>{legalIds.join(" • ")}</small>}
            </div>
          </div>

          <div className="invoice-title-block">
            <span className="invoice-title-label">FACTURE</span>

            <strong>{invoice.invoice_number}</strong>

            <span
              className={`invoice-detail-status ${
                STATUS_CLASS[invoice.status]
              }`}
            >
              {STATUS_LABELS[invoice.status] || invoice.status}
            </span>
          </div>
        </div>

        <div className="invoice-document-divider" />

        {/* INFOS */}
        <div className="invoice-info-grid">
          <div className="invoice-info-block">
            <div className="invoice-info-heading">
              <User size={16} />
              Facturé à
            </div>

            <strong>{invoice.client_name || "—"}</strong>

            {invoice.contact_name && <span>{invoice.contact_name}</span>}

            {invoice.client_address && <span>{invoice.client_address}</span>}

            {invoice.client_city && <span>{invoice.client_city}</span>}

            {invoice.client_phone && (
              <span>Tél. : {invoice.client_phone}</span>
            )}

            {invoice.client_email && <span>{invoice.client_email}</span>}

            {invoice.client_nif && <span>NIF : {invoice.client_nif}</span>}

            {invoice.client_rccm && (
              <span>RCCM : {invoice.client_rccm}</span>
            )}
          </div>

          <div className="invoice-info-block">
            <div className="invoice-info-heading">
              <Calendar size={16} />
              Informations
            </div>

            <div className="invoice-info-line">
              <span>Date de facture</span>
              <strong>{formatDate(invoice.issue_date)}</strong>
            </div>

            <div className="invoice-info-line">
              <span>Date d'échéance</span>
              <strong>{formatDate(invoice.due_date)}</strong>
            </div>

            {invoice.market_number && (
              <div className="invoice-info-line">
                <span>Marché</span>
                <strong>{invoice.market_number}</strong>
              </div>
            )}
          </div>
        </div>

        {/* OBJET */}
        {invoice.subject && (
          <div className="invoice-subject">
            <span>Objet</span>
            <strong>{invoice.subject}</strong>
          </div>
        )}

        {/* LIGNES */}
        <div className="invoice-items-table-wrapper">
          <table className="invoice-detail-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qté</th>
                <th>Unité</th>
                <th>Prix unitaire</th>
                <th>Remise</th>
                <th>Taxe</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {invoice.items?.map((item, index) => {
                const itemDiscount = Number(item.discount_amount) || 0;

                return (
                  <tr key={item.id || index}>
                    <td>
                      <strong>{item.description}</strong>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{formatMoney(item.unit_price)}</td>
                    <td>
                      {itemDiscount > 0
                        ? `- ${formatMoney(itemDiscount)}`
                        : "—"}
                    </td>
                    <td>{Number(item.tax_rate || 0)} %</td>
                    <td>
                      <strong>{formatMoney(item.total_amount)}</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TOTAUX */}
        <div className="invoice-total-area">
          <div className="invoice-total-box">
            <div>
              <span>Sous-total brut</span>
              <strong>{formatMoney(totals.gross)}</strong>
            </div>

            <div>
              <span>Remise</span>
              <strong>- {formatMoney(totals.discount)}</strong>
            </div>

            <div>
              <span>Total HT</span>
              <strong>{formatMoney(totals.net)}</strong>
            </div>

            <div>
              <span>Taxes</span>
              <strong>{formatMoney(totals.tax)}</strong>
            </div>

            <div className="invoice-total-final">
              <span>Total TTC</span>
              <strong>{formatMoney(totals.total)}</strong>
            </div>

            <div className="invoice-paid-line">
              <span>Déjà payé</span>
              <strong>{formatMoney(invoice.amount_paid)}</strong>
            </div>

            <div className="invoice-remaining-line">
              <span>Reste à payer</span>
              <strong>{formatMoney(remaining)}</strong>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {invoice.notes && (
          <div className="invoice-notes">
            <strong>Notes</strong>
            <p>{invoice.notes}</p>
          </div>
        )}

        {/* SIGNATURES */}
        <div className="invoice-signatures">
          <div className="invoice-signature-box">
            <span>Pour l'entreprise</span>
            <strong>{company?.name || ""}</strong>
            <small>Signature et cachet</small>
          </div>

          <div className="invoice-signature-box">
            <span>Le client</span>
            <small>Date, signature et cachet</small>
          </div>
        </div>

        {/* PIED DE PAGE */}
        <div className="invoice-footer-document">
          <p>Merci pour votre confiance.</p>

          <strong>{company?.legal_name || company?.name}</strong>

          {legalIds.length > 0 && <span>{legalIds.join(" • ")}</span>}

          {(company?.phone || company?.email) && (
            <span>
              {[company.phone, company.email].filter(Boolean).join(" • ")}
            </span>
          )}
        </div>
      </div>

      {/* PAIEMENTS (écran uniquement : absent du PDF et de l'impression) */}
      <div className="invoice-payments-wrapper">
        <div className="invoice-payment-summary">
          <div className="payment-summary-card">
            <span>Total facture</span>
            <strong>{formatMoney(paymentSummary.total_amount)}</strong>
          </div>

          <div className="payment-summary-card">
            <span>Total payé</span>
            <strong>{formatMoney(paymentSummary.amount_paid)}</strong>
          </div>

          <div className="payment-summary-card payment-remaining">
            <span>Reste à payer</span>
            <strong>{formatMoney(paymentSummary.remaining_amount)}</strong>
          </div>
        </div>

        <div className="invoice-payments-section">
          <div className="invoice-payments-header">
            <div>
              <h3>Paiements</h3>
              <p>Historique des règlements de cette facture</p>
            </div>

            {canAddPayment && (
              <button
                type="button"
                className="invoice-payment-button"
                onClick={openPaymentModal}
              >
                <Plus size={17} />
                Ajouter un paiement
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="invoice-no-payments">
              Aucun paiement enregistré pour cette facture.
            </div>
          ) : (
            <div className="invoice-payments-table-wrapper">
              <table className="invoice-payments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Référence</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.payment_date)}</td>

                      <td className="payment-amount">
                        {formatMoney(payment.amount)}
                      </td>

                      <td>
                        {paymentMethodLabels[payment.payment_method] ||
                          payment.payment_method}
                      </td>

                      <td>{payment.reference || "—"}</td>

                      <td>{payment.notes || "—"}</td>

                      <td>
                        <button
                          type="button"
                          className="payment-delete-button"
                          onClick={() => handleDeletePayment(payment.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
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

      {/* MODAL : AJOUTER UN PAIEMENT */}
      {showPaymentModal && (
        <div
          className="payment-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentModal(false);
            }
          }}
        >
          <div className="payment-modal">
            <div className="payment-modal-header">
              <div>
                <h2>Ajouter un paiement</h2>
                <p>Facture {invoice.invoice_number}</p>
              </div>

              <button
                type="button"
                className="payment-modal-close"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="payment-modal-info">
              <div>
                <span>Total facture</span>
                <strong>{formatMoney(paymentSummary.total_amount)}</strong>
              </div>

              <div>
                <span>Déjà payé</span>
                <strong>{formatMoney(paymentSummary.amount_paid)}</strong>
              </div>

              <div>
                <span>Reste</span>
                <strong>{formatMoney(paymentSummary.remaining_amount)}</strong>
              </div>
            </div>

            <form onSubmit={handleAddPayment}>
              <div className="payment-form-grid">
                <div className="payment-form-group">
                  <label>Date du paiement</label>

                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="payment-form-group">
                  <label>Montant</label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={paymentSummary.remaining_amount}
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: e.target.value,
                      })
                    }
                    placeholder="Ex : 500000"
                    required
                  />
                </div>

                <div className="payment-form-group">
                  <label>Mode de paiement</label>

                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_method: e.target.value,
                      })
                    }
                  >
                    <option value="cash">Espèces</option>
                    <option value="bank_transfer">Virement bancaire</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Chèque</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="payment-form-group">
                  <label>Référence</label>

                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference: e.target.value,
                      })
                    }
                    placeholder="N° transaction, chèque..."
                  />
                </div>
              </div>

              <div className="payment-form-group">
                <label>Notes</label>

                <textarea
                  rows="3"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="payment-modal-actions">
                <button
                  type="button"
                  className="payment-cancel-button"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="payment-submit-button"
                  disabled={paymentLoading}
                >
                  {paymentLoading
                    ? "Enregistrement..."
                    : "Enregistrer le paiement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}