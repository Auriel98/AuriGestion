import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Calculator,
  Building2,
  Download,
} from "lucide-react";

import api, { API_ORIGIN } from "../../api/api";

import "./QuoteDetail.css";

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR").format(
    Number(value) || 0
  );

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("fr-FR")
    : "—";

const statusLabels = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  cancelled: "Annulé",
};

// Même appel que dans Company.jsx, compatible avec api("/company") et api.get("/company")
const fetchCompany = () =>
  typeof api.get === "function"
    ? api.get("/company")
    : api("/company");

function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);

  const documentRef = useRef(null);

  const loadQuote = async () => {
    try {
      setLoading(true);

      const data = await api.get(`/quotes/${id}`);

      const detail = data.quote || data;

      setQuote(detail);
      setItems(data.items || detail.items || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Impossible de charger le devis."
      );
    } finally {
      setLoading(false);
    }
  };

  // Si le chargement échoue, le devis s'affiche quand même
  const loadCompany = async () => {
    try {
      const data = await fetchCompany();

      setCompany(data?.company || data);
    } catch (error) {
      console.error(
        "Erreur chargement entreprise :",
        error
      );
    }
  };

  useEffect(() => {
    loadQuote();
  }, [id]);

  useEffect(() => {
    loadCompany();
  }, []);

  const changeStatus = async (status) => {
    try {
      await api.patch(
        `/quotes/${id}/status`,
        { status }
      );

      await loadQuote();

      setMessage(
        "Statut du devis mis à jour."
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Impossible de modifier le statut."
      );
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
      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );

      const { default: html2pdf } = await import(
        "html2pdf.js"
      );

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${quote.quote_number || "devis"}.pdf`,
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

      setMessage(
        "Impossible de générer le PDF."
      );
    } finally {
      element.classList.remove("pdf-mode");
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="quote-detail-page">
        <div className="quote-detail-loading">
          Chargement du devis...
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="quote-detail-page">
        <button
          className="quote-back-button"
          onClick={() => navigate("/devis")}
        >
          <ArrowLeft size={18} />
          Retour aux devis
        </button>

        <div className="quote-detail-error">
          {message || "Devis introuvable."}
        </div>
      </div>
    );
  }

  const logoSrc = company?.logo_url
    ? `${API_ORIGIN}${company.logo_url}`
    : null;

  const legalIds = [
    company?.nif && `NIF : ${company.nif}`,
    company?.rccm && `RCCM : ${company.rccm}`,
    company?.cnss && `CNSS : ${company.cnss}`,
  ].filter(Boolean);

  return (
    <div className="quote-detail-page">

      {/* HEADER (écran uniquement) */}

      <div className="quote-detail-header">

        <div>

          <button
            className="quote-back-button"
            onClick={() => navigate("/devis")}
          >
            <ArrowLeft size={17} />
            Retour aux devis
          </button>

          <div className="quote-title-row">

            <div className="quote-title-icon">
              <FileText size={23} />
            </div>

            <div>
              <h1>
                {quote.quote_number}
              </h1>

              <p>
                {quote.subject ||
                  "Devis client"}
              </p>
            </div>

          </div>

        </div>

        <div className="quote-detail-actions">

          {quote.status === "draft" && (
            <>
              <button
                className="quote-action-secondary"
                onClick={() =>
                  navigate(
                    `/devis?edit=${quote.id}`
                  )
                }
              >
                <Pencil size={17} />
                Modifier
              </button>

              <button
                className="quote-action-primary"
                onClick={() =>
                  changeStatus("sent")
                }
              >
                <Send size={17} />
                Envoyer
              </button>
            </>
          )}

          {quote.status === "sent" && (
            <>
              <button
                className="quote-action-secondary"
                onClick={() =>
                  changeStatus("rejected")
                }
              >
                <XCircle size={17} />
                Refuser
              </button>

              <button
                className="quote-action-primary"
                onClick={() =>
                  changeStatus("accepted")
                }
              >
                <CheckCircle size={17} />
                Accepter
              </button>
            </>
          )}

          <button
            className="quote-action-secondary"
            onClick={downloadPdf}
            disabled={downloading}
          >
            <Download size={17} />
            {downloading
              ? "Génération..."
              : "Télécharger"}
          </button>

          <button
            className="quote-action-secondary"
            onClick={() =>
              window.print()
            }
          >
            <Printer size={17} />
            Imprimer
          </button>

        </div>

      </div>

      {message && (
        <div className="quote-detail-message">
          {message}
        </div>
      )}

      {/* DOCUMENT */}

      <div className="quote-document" ref={documentRef}>

        {/* TOP : ENTREPRISE + DEVIS */}

        <div className="quote-document-top">

          <div className="quote-company">

            <div className="quote-company-logo">
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

            <div className="quote-company-info">

              <h3>
                {company?.name || "Entreprise"}
              </h3>

              {company?.legal_name && (
                <span>{company.legal_name}</span>
              )}

              {company?.address && (
                <span>{company.address}</span>
              )}

              {company?.phone && (
                <span>Tél : {company.phone}</span>
              )}

              {company?.email && (
                <span>{company.email}</span>
              )}

              {legalIds.length > 0 && (
                <small>
                  {legalIds.join(" • ")}
                </small>
              )}

            </div>

          </div>

          <div className="quote-document-title">

            <span className="quote-document-label">
              DEVIS
            </span>

            <h2>
              {quote.quote_number}
            </h2>

            <span
              className={`quote-detail-status ${quote.status}`}
            >
              {statusLabels[quote.status] ||
                quote.status}
            </span>

          </div>

        </div>

        <div className="quote-document-separator" />

        {/* INFORMATIONS */}

        <div className="quote-information-grid">

          <div className="quote-info-block">

            <div className="quote-info-heading">
              <User size={17} />
              Client
            </div>

            <strong>
              {quote.client_name ||
                "—"}
            </strong>

            {quote.client_contact_name && (
              <span>
                {quote.client_contact_name}
              </span>
            )}

            {quote.client_email && (
              <span>
                {quote.client_email}
              </span>
            )}

            {quote.client_phone && (
              <span>
                {quote.client_phone}
              </span>
            )}

            {quote.client_address && (
              <span>
                {quote.client_address}
              </span>
            )}

          </div>

          <div className="quote-info-block">

            <div className="quote-info-heading">
              <Calendar size={17} />
              Informations
            </div>

            <div className="quote-info-line">
              <span>Date</span>

              <strong>
                {formatDate(quote.issue_date)}
              </strong>
            </div>

            <div className="quote-info-line">
              <span>Valable jusqu'au</span>

              <strong>
                {formatDate(quote.valid_until)}
              </strong>
            </div>

          </div>

        </div>

        {/* OBJET */}

        {quote.subject && (
          <div className="quote-subject">

            <span>
              Objet
            </span>

            <strong>
              {quote.subject}
            </strong>

          </div>
        )}

        {/* PRESTATIONS */}

        <div className="quote-lines-section">

          <div className="quote-section-heading">

            <div>
              <Calculator size={18} />

              <span>
                Prestations
              </span>
            </div>

          </div>

          <div className="quote-lines-wrapper">

            <table className="quote-lines-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Désignation</th>
                  <th>Qté</th>
                  <th>Unité</th>
                  <th>Prix unitaire</th>
                  <th>Remise</th>
                  <th>Taxe</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>

                {items.map(
                  (item, index) => (
                    <tr key={item.id || index}>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {item.description}
                        </strong>
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        {item.unit}
                      </td>

                      <td>
                        {formatMoney(
                          item.unit_price
                        )}{" "}
                        FCFA
                      </td>

                      <td>
                        {formatMoney(
                          item.discount_amount
                        )}{" "}
                        FCFA
                      </td>

                      <td>
                        {Number(
                          item.tax_rate
                        ) || 0}
                        %
                      </td>

                      <td>
                        <strong>
                          {formatMoney(
                            item.total_amount
                          )}{" "}
                          FCFA
                        </strong>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* TOTAUX */}

        <div className="quote-summary">

          <div className="quote-summary-box">

            <div>
              <span>
                Sous-total
              </span>

              <strong>
                {formatMoney(
                  quote.subtotal
                )}{" "}
                FCFA
              </strong>
            </div>

            <div>
              <span>
                Remise
              </span>

              <strong>
                -{" "}
                {formatMoney(
                  quote.discount_amount
                )}{" "}
                FCFA
              </strong>
            </div>

            <div>
              <span>
                Taxes
              </span>

              <strong>
                {formatMoney(
                  quote.tax_amount
                )}{" "}
                FCFA
              </strong>
            </div>

            <div className="quote-grand-total">

              <span>
                TOTAL
              </span>

              <strong>
                {formatMoney(
                  quote.total_amount
                )}{" "}
                FCFA
              </strong>

            </div>

          </div>

        </div>

        {/* NOTES */}

        {quote.notes && (
          <div className="quote-notes">

            <h3>
              Conditions / Notes
            </h3>

            <p>
              {quote.notes}
            </p>

          </div>
        )}

        {/* SIGNATURES */}

        <div className="quote-signatures">

          <div className="quote-signature-box">
            <span>Pour l'entreprise</span>
            <strong>{company?.name || ""}</strong>
          </div>

          <div className="quote-signature-box">
            <span>Bon pour accord du client</span>
            <small>Date, signature et cachet</small>
          </div>

        </div>

        {/* PIED DE PAGE */}

        <div className="quote-footer">

          <strong>
            {company?.legal_name || company?.name}
          </strong>

          {legalIds.length > 0 && (
            <span>{legalIds.join(" • ")}</span>
          )}

          {(company?.phone || company?.email) && (
            <span>
              {[company.phone, company.email]
                .filter(Boolean)
                .join(" • ")}
            </span>
          )}

        </div>

      </div>

    </div>
  );
}

export default QuoteDetail;