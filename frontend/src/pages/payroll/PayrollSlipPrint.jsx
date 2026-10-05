import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api, { API_ORIGIN } from "../../api/api";
import "./PayrollSlipPrint.css";

const money = (value) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const date = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
};

/* Tableau en grille <div> : plus fiable que <table> pour html2canvas / PDF */
function PayTable({ title, amountLabel, rows, amountKey, totalLabel, total }) {
  return (
    <section className="payroll-section">
      <div className="section-heading">{title}</div>

      <div className="pay-table">
        <div className="pay-row pay-head">
          <div>Rubrique</div>
          <div className="num">Base</div>
          <div className="num">Taux</div>
          <div className="num">{amountLabel}</div>
        </div>

        {rows.map((line) => (
          <div className="pay-row" key={line.id}>
            <div>{line.designation}</div>
            <div className="num">{money(line.base_amount)}</div>
            <div className="num">
              {line.rate != null ? `${line.rate}%` : "-"}
            </div>
            <div className="num strong">{money(line[amountKey])}</div>
          </div>
        ))}

        {totalLabel && (
          <div className="pay-row pay-total">
            <div className="span3">{totalLabel}</div>
            <div className="num">{money(total)}</div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function PayrollSlipPrint() {
  const { id } = useParams();
  const documentRef = useRef(null);

  const [slip, setSlip] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadSlip();
  }, [id]);

  const loadSlip = async () => {
    try {
      setLoading(true);

      const [slipResponse, linesResponse] = await Promise.all([
        api.get(`/payroll/slips/${id}`),
        api.get(`/payroll/slips/${id}/lines`),
      ]);

      setSlip(slipResponse.slip || slipResponse);
      setLines(linesResponse.lines || linesResponse || []);
    } catch (error) {
      console.error(error);
      alert(error.message || "Impossible de charger le bulletin.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const element = documentRef.current;
    if (!element || downloading) return;

    try {
      setDownloading(true);

      // Mode PDF : pas d'ombre, pas de marge auto -> rendu centré et exact
      element.classList.add("pdf-mode");

      const html2pdf = (await import("html2pdf.js")).default;

      const safe = (value) =>
        String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9_-]+/g, "_")
          .replace(/^_+|_+$/g, "");

      const month = slip.period_month ?? slip.month;
      const year = slip.period_year ?? slip.year;

      const filename =
        [
          "bulletin_paie",
          safe(slip.last_name),
          safe(slip.first_name),
          month && year ? `${month}-${year}` : "",
        ]
          .filter(Boolean)
          .join("_") + ".pdf";

      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: "#ffffff",
            width: element.offsetWidth,
            windowWidth: element.offsetWidth,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: { mode: ["css"] },
        })
        .from(element)
        .save();
    } catch (error) {
      console.error(error);
      alert("Impossible de télécharger le bulletin.");
    } finally {
      element?.classList.remove("pdf-mode");
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="print-loading">Chargement du bulletin...</div>;
  }

  if (!slip) {
    return <div className="print-loading">Bulletin introuvable.</div>;
  }

  const earnings = lines.filter((line) => line.category === "earning");

  const deductions = lines.filter(
    (line) => line.category === "deduction" || line.category === "tax"
  );

  const employerContributions = lines.filter(
    (line) => line.category === "employer_contribution"
  );

  const periodMonth = slip.period_month ?? slip.month;
  const periodYear = slip.period_year ?? slip.year;

  return (
    <div className="print-page">
      {/* ACTIONS */}
      <div className="print-toolbar no-print">
        <button onClick={() => window.history.back()}>← Retour</button>

        <div className="toolbar-actions">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="download-button"
          >
            {downloading ? "Génération du PDF..." : "Télécharger (PDF)"}
          </button>

          <button onClick={() => window.print()} className="print-button">
            Imprimer le bulletin
          </button>
        </div>
      </div>

      {/* BULLETIN */}
      <div className="payslip-document" ref={documentRef}>
        {/* ENTREPRISE - CORRIGÉ : infos de l'entreprise et non de l'employé */}
        <header className="company-header">
          <div className="company-logo">
            {slip.company_logo ? (
              <img
                src={`${API_ORIGIN}${slip.company_logo}`}
                alt="Logo entreprise"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="logo-placeholder">
                {slip.company_name?.substring(0, 2).toUpperCase() || "AG"}
              </div>
            )}
          </div>

          <div className="company-details">
            <h1>{slip.company_name || "Entreprise"}</h1>
            {slip.company_legal_name && <p>{slip.company_legal_name}</p>}
            {slip.company_address && <p>{slip.company_address}</p>}
            <p>
              {slip.company_phone || ""}
              {slip.company_phone && slip.company_email ? " • " : ""}
              {slip.company_email || ""}
            </p>
          </div>

          <div className="payslip-title">
            <h2>BULLETIN DE PAIE</h2>
            <strong>
              {periodMonth && periodYear
                ? `${String(periodMonth).padStart(2, "0")}/${periodYear}`
                : "-"}
            </strong>
            <span>N° {slip.slip_number}</span>
          </div>
        </header>

        {/* IDENTIFIANTS ENTREPRISE - CORRIGÉ : alias company_* */}
        <div className="company-identifiers">
          <div>
            <span>NIF</span>
            <strong>{slip.company_nif || "-"}</strong>
          </div>
          <div>
            <span>RCCM</span>
            <strong>{slip.company_rccm || "-"}</strong>
          </div>
          <div>
            <span>CNSS</span>
            <strong>{slip.company_cnss || "-"}</strong>
          </div>
        </div>

        {/* SALARIÉ */}
        <section className="employee-section">
          <div className="section-heading">INFORMATIONS DU SALARIÉ</div>

          <div className="employee-grid">
            <div>
              <span>Nom et prénom</span>
              <strong>
                {slip.first_name} {slip.last_name}
              </strong>
            </div>
            <div>
              <span>Matricule</span>
              <strong>{slip.matricule || "-"}</strong>
            </div>
            <div>
              <span>Emploi</span>
              <strong>{slip.position || "-"}</strong>
            </div>
            <div>
              <span>N° CNSS</span>
              <strong>{slip.cnss_number || "-"}</strong>
            </div>
            <div>
              <span>Date d'embauche</span>
              <strong>{date(slip.hire_date)}</strong>
            </div>
            <div>
              <span>Situation familiale</span>
              <strong>{slip.marital_status || "-"}</strong>
            </div>
            <div>
              <span>Nombre d'enfants</span>
              <strong>{slip.children_count ?? 0}</strong>
            </div>
            <div>
              <span>Nationalité</span>
              <strong>{slip.nationality || "-"}</strong>
            </div>
          </div>
        </section>

        {/* GAINS */}
        <PayTable
          title="GAINS"
          amountLabel="Gain"
          rows={earnings}
          amountKey="gain"
          totalLabel="TOTAL BRUT"
          total={slip.gross_salary}
        />

        {/* RETENUES */}
        <PayTable
          title="RETENUES"
          amountLabel="Retenue"
          rows={deductions}
          amountKey="deduction"
          totalLabel="TOTAL RETENUES"
          total={slip.employee_deductions}
        />

        {/* BASES FISCALES */}
        <section className="bases-section">
          <div>
            <span>Salaire brut</span>
            <strong>{money(slip.gross_salary)} FCFA</strong>
          </div>
          <div>
            <span>Salaire imposable</span>
            <strong>{money(slip.taxable_salary)} FCFA</strong>
          </div>
          <div>
            <span>Base fiscale</span>
            <strong>{money(slip.tax_base)} FCFA</strong>
          </div>
        </section>

        {/* NET */}
        <section className="net-box">
          <div>
            <span>NET À PAYER</span>
            <small>Montant à verser au salarié</small>
          </div>
          <strong>{money(slip.net_to_pay)} FCFA</strong>
        </section>

        {/* CHARGES PATRONALES */}
        {employerContributions.length > 0 && (
          <PayTable
            title="CHARGES PATRONALES"
            amountLabel="Montant"
            rows={employerContributions}
            amountKey="employer_amount"
          />
        )}

        {/* PAIEMENT */}
        <section className="payment-section">
          <div>
            <span>Mode de paiement</span>
            <strong>{slip.payment_method || "Non renseigné"}</strong>
          </div>
          <div>
            <span>Référence paiement</span>
            <strong>{slip.payment_reference || "-"}</strong>
          </div>
        </section>

        {/* SIGNATURES */}
        <section className="signature-section">
          <div>
            <strong>L'employeur</strong>
            <div className="signature-space" />
            <span>Signature</span>
          </div>
          <div>
            <strong>Le salarié</strong>
            <div className="signature-space" />
            <span>Signature</span>
          </div>
        </section>

        <footer className="payslip-footer">
          Document généré par AuriGestion
        </footer>
      </div>
    </div>
  );
}