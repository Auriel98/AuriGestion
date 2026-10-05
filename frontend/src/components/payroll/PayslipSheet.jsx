import React from "react";

import {
    PAYMENT_LABELS,
    formatMoney,
    formatNumber
} from "./payrollLabels";

import { periodLabel, formatDate } from "./payrollRunHelpers";


// =====================================================
// BULLETIN DE PAIE (affichage et impression)
// =====================================================

const MARITAL_LABELS = {
    celibataire: "Célibataire",
    marie: "Marié(e)",
    divorce: "Divorcé(e)",
    veuf: "Veuf / Veuve"
};


const PayslipSheet = ({ company, payslip, lines }) => {

    const byCategory = (category) =>
        lines.filter((line) => line.category === category);

    const earnings = byCategory("earning");
    const contributions = byCategory("employee_contribution");
    const taxes = byCategory("tax");
    const nonTaxable = byCategory("non_taxable_earning");
    const deductions = byCategory("deduction");
    const employerLines = byCategory("employer_contribution");

    const totalContributions = contributions.reduce(
        (sum, line) => sum + Number(line.deduction_amount),
        0
    );

    const totalTaxes = taxes.reduce(
        (sum, line) => sum + Number(line.deduction_amount),
        0
    );

    const marital =
        MARITAL_LABELS[payslip.marital_status] ||
        payslip.marital_status ||
        "—";


    const renderLine = (line) => (

        <tr key={line.id}>

            <td>{line.code}</td>

            <td>{line.label}</td>

            <td className="num">
                {line.quantity !== null
                    ? formatNumber(line.quantity)
                    : ""}
            </td>

            <td className="num">
                {line.base_amount !== null
                    ? formatNumber(line.base_amount)
                    : ""}
            </td>

            <td className="num">
                {line.rate !== null
                    ? `${formatNumber(line.rate)} %`
                    : ""}
            </td>

            <td className="num">
                {line.gain_amount > 0
                    ? formatNumber(line.gain_amount)
                    : ""}
            </td>

            <td className="num">
                {line.deduction_amount > 0
                    ? formatNumber(line.deduction_amount)
                    : ""}
            </td>

        </tr>
    );


    const renderTotal = (label, gain, deduction) => (

        <tr className="payslip-total-row">

            <td></td>

            <td colSpan="4">{label}</td>

            <td className="num">
                {gain !== null ? formatNumber(gain) : ""}
            </td>

            <td className="num">
                {deduction !== null ? formatNumber(deduction) : ""}
            </td>

        </tr>
    );


    return (
        <div className="payslip-sheet">

            {/* ---------- EN-TETE ---------- */}

            <div className="payslip-header">

                <div className="payslip-company">

                    <strong>
                        {company?.legal_name || company?.name}
                    </strong>

                    {company?.nif && <span>NIF : {company.nif}</span>}

                    {company?.rccm && <span>RCCM : {company.rccm}</span>}

                    {company?.phone && <span>Tél : {company.phone}</span>}

                    {company?.address && <span>{company.address}</span>}

                    {company?.cnss && <span>CNSS : {company.cnss}</span>}

                </div>

                <div className="payslip-title">

                    <h2>BULLETIN DE PAIE</h2>

                    <p>
                        Mois de{" "}
                        {periodLabel(
                            payslip.period_year,
                            payslip.period_month
                        ).toLowerCase()}
                    </p>

                    <p>
                        Période du {formatDate(payslip.period_start)} au{" "}
                        {formatDate(payslip.period_end)}
                    </p>

                </div>

            </div>


            {/* ---------- EMPLOYE ---------- */}

            <div className="payslip-employee">

                <div className="payslip-employee-name">
                    {payslip.employee_name}
                </div>

                <table>

                    <tbody>

                        <tr>
                            <th>Matricule</th>
                            <td>{payslip.employee_matricule || "—"}</td>

                            <th>Emploi occupé</th>
                            <td>{payslip.position || "—"}</td>

                            <th>Service</th>
                            <td>{payslip.service_name || "—"}</td>
                        </tr>

                        <tr>
                            <th>N° CNSS</th>
                            <td>{payslip.cnss_number || "—"}</td>

                            <th>Date d'embauche</th>
                            <td>{formatDate(payslip.hire_date) || "—"}</td>

                            <th>Catégorie</th>
                            <td>{payslip.category || "—"}</td>
                        </tr>

                        <tr>
                            <th>Situation familiale</th>
                            <td>{marital}</td>

                            <th>Nombre d'enfants</th>
                            <td>{payslip.children_count ?? 0}</td>

                            <th>Parts</th>
                            <td>{formatNumber(payslip.tax_parts)}</td>
                        </tr>

                    </tbody>

                </table>

            </div>


            {/* ---------- LIGNES ---------- */}

            <table className="payslip-lines">

                <thead>

                    <tr>
                        <th>N°</th>
                        <th>Désignation</th>
                        <th>Nombre</th>
                        <th>Base</th>
                        <th>Taux</th>
                        <th>Gain</th>
                        <th>Retenue</th>
                    </tr>

                </thead>

                <tbody>

                    {earnings.map(renderLine)}

                    {renderTotal("Total brut", payslip.gross_total, null)}

                    {contributions.map(renderLine)}

                    {contributions.length > 0 &&
                        renderTotal(
                            "Total cotisations",
                            null,
                            totalContributions
                        )}

                    <tr className="payslip-info-row">
                        <td></td>
                        <td colSpan="3">Base imposable</td>
                        <td></td>
                        <td className="num">
                            {formatNumber(payslip.taxable_base)}
                        </td>
                        <td></td>
                    </tr>

                    {taxes.map(renderLine)}

                    {taxes.length > 0 &&
                        renderTotal("Total impôts", null, totalTaxes)}

                    {renderTotal("Salaire net", payslip.net_salary, null)}

                    {nonTaxable.map(renderLine)}

                    {deductions.map(renderLine)}

                    {Number(payslip.rounding_amount) !== 0 && (

                        <tr>
                            <td></td>
                            <td>Arrondi du mois</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="num">
                                {payslip.rounding_amount > 0
                                    ? formatNumber(payslip.rounding_amount)
                                    : ""}
                            </td>
                            <td className="num">
                                {payslip.rounding_amount < 0
                                    ? formatNumber(
                                        Math.abs(payslip.rounding_amount)
                                    )
                                    : ""}
                            </td>
                        </tr>

                    )}

                </tbody>

            </table>


            {/* ---------- NET A PAYER ---------- */}

            <div className="payslip-net">

                <span>Net à payer</span>

                <strong>{formatMoney(payslip.net_to_pay)}</strong>

            </div>


            {/* ---------- BAS DE PAGE ---------- */}

            <div className="payslip-footer">

                <div className="payslip-box">

                    <h4>Charges patronales</h4>

                    {employerLines.length === 0 ? (

                        <p>—</p>

                    ) : (

                        <>
                            {employerLines.map((line) => (
                                <div key={line.id} className="payslip-box-row">
                                    <span>{line.label}</span>
                                    <span>
                                        {formatNumber(line.employer_amount)}
                                    </span>
                                </div>
                            ))}

                            <div className="payslip-box-row payslip-box-total">
                                <span>Total</span>
                                <span>
                                    {formatNumber(
                                        payslip.total_employer_contributions
                                    )}
                                </span>
                            </div>
                        </>
                    )}

                </div>

                <div className="payslip-box">

                    <h4>Mode de paiement</h4>

                    <p>
                        {PAYMENT_LABELS[payslip.payment_method] ||
                            payslip.payment_method}
                    </p>

                    {payslip.notes && (
                        <p className="payslip-notes">{payslip.notes}</p>
                    )}

                </div>

                <div className="payslip-box payslip-signatures">

                    <h4>Émargement</h4>

                    <div>

                        <span>Employeur</span>

                        <span>Employé</span>

                    </div>

                </div>

            </div>

        </div>
    );
};


export default PayslipSheet;
