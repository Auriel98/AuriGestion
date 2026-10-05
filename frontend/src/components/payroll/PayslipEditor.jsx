import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

import api from "../../api/api";

import {
    CATEGORY_LABELS,
    PAYMENT_LABELS
} from "./payrollLabels";


// =====================================================
// SAISIES DU BULLETIN (brouillon uniquement)
// Jours payés, heures supplémentaires, lignes manuelles.
// Toute modification recalcule le bulletin.
// =====================================================

const PayslipEditor = ({ payslip, lines, overtime, onSaved }) => {

    const [overtimeTypes, setOvertimeTypes] = useState([]);

    const [manualRubrics, setManualRubrics] = useState([]);

    const [daysPaid, setDaysPaid] = useState(payslip.days_paid);

    const [paymentMethod, setPaymentMethod] = useState(
        payslip.payment_method
    );

    const [notes, setNotes] = useState(payslip.notes || "");

    const [overtimeRows, setOvertimeRows] = useState(
        overtime
            .filter((entry) => entry.overtime_type_id)
            .map((entry) => ({
                overtime_type_id: entry.overtime_type_id,
                hours: entry.hours
            }))
    );

    // { [rubric_id]: "montant" }
    const [manualAmounts, setManualAmounts] = useState(() => {

        const initial = {};

        for (const line of lines) {

            if (line.is_manual && line.rubric_id) {

                initial[line.rubric_id] =
                    Number(line.gain_amount) +
                    Number(line.deduction_amount) +
                    Number(line.employer_amount);
            }
        }

        return initial;
    });

    const [saving, setSaving] = useState(false);


    // Types d'heures supp. et rubriques à saisir à la main
    useEffect(() => {

        const load = async () => {

            try {

                const [typesResponse, rubricsResponse] =
                    await Promise.all([
                        api.get("/payroll/overtime-types"),
                        api.get("/payroll/rubrics")
                    ]);

                setOvertimeTypes(
                    (typesResponse.overtime_types || []).filter(
                        (type) => type.is_active
                    )
                );

                setManualRubrics(
                    (rubricsResponse.rubrics || []).filter(
                        (rubric) =>
                            rubric.is_active &&
                            (rubric.calc_type === "manual" ||
                                rubric.category === "deduction")
                    )
                );

            } catch (error) {

                alert(
                    error.message ||
                    "Impossible de charger les options du bulletin."
                );
            }
        };

        load();
    }, []);


    const addOvertimeRow = () => {

        if (overtimeTypes.length === 0) {
            alert(
                "Crée d'abord un type d'heures supplémentaires dans la configuration de la paie."
            );
            return;
        }

        setOvertimeRows((previous) => [
            ...previous,
            {
                overtime_type_id: overtimeTypes[0].id,
                hours: ""
            }
        ]);
    };


    const updateOvertimeRow = (index, field, value) => {

        setOvertimeRows((previous) =>
            previous.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        );
    };


    const removeOvertimeRow = (index) => {

        setOvertimeRows((previous) =>
            previous.filter((_, i) => i !== index)
        );
    };


    const handleSave = async (e) => {

        e.preventDefault();

        const payload = {
            days_paid: daysPaid,
            payment_method: paymentMethod,
            notes,
            overtime: overtimeRows
                .filter((row) => Number(row.hours) > 0)
                .map((row) => ({
                    overtime_type_id: row.overtime_type_id,
                    hours: Number(row.hours)
                })),
            manual_lines: Object.entries(manualAmounts)
                .filter(
                    ([, amount]) =>
                        amount !== "" && Number(amount) > 0
                )
                .map(([rubric_id, amount]) => ({
                    rubric_id,
                    amount: Number(amount)
                }))
        };

        try {

            setSaving(true);

            const response = await api.put(
                `/payroll/payslips/${payslip.id}`,
                payload
            );

            onSaved(response);

        } catch (error) {

            alert(
                error.message ||
                "Impossible d'enregistrer le bulletin."
            );

        } finally {

            setSaving(false);
        }
    };


    return (
        <form
            className="payroll-card payslip-editor"
            onSubmit={handleSave}
        >

            <h3>Saisies du bulletin</h3>

            <p className="payroll-hint">
                Ces informations sont saisies ici : le pointage n'influence
                jamais la paie. Chaque enregistrement recalcule le bulletin.
            </p>


            <div className="payroll-grid-2">

                <div className="payroll-field">

                    <label>Jours payés</label>

                    <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="31"
                        value={daysPaid}
                        onChange={(e) => setDaysPaid(e.target.value)}
                        required
                    />

                </div>

                <div className="payroll-field">

                    <label>Mode de paiement</label>

                    <select
                        value={paymentMethod}
                        onChange={(e) =>
                            setPaymentMethod(e.target.value)
                        }
                    >
                        {Object.entries(PAYMENT_LABELS).map(
                            ([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            )
                        )}
                    </select>

                </div>

            </div>


            <h4 className="payroll-subtitle">Heures supplémentaires</h4>

            {overtimeRows.length === 0 && (
                <p className="payroll-hint">
                    Aucune heure supplémentaire.
                </p>
            )}

            {overtimeRows.map((row, index) => (

                <div key={index} className="payslip-editor-row">

                    <select
                        value={row.overtime_type_id}
                        onChange={(e) =>
                            updateOvertimeRow(
                                index,
                                "overtime_type_id",
                                e.target.value
                            )
                        }
                    >
                        {overtimeTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.label} (+{type.major_percent} %)
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        step="0.25"
                        min="0"
                        placeholder="Heures"
                        value={row.hours}
                        onChange={(e) =>
                            updateOvertimeRow(
                                index,
                                "hours",
                                e.target.value
                            )
                        }
                    />

                    <button
                        type="button"
                        className="payroll-icon-btn payroll-icon-danger"
                        title="Supprimer"
                        onClick={() => removeOvertimeRow(index)}
                    >
                        <Trash2 size={16} />
                    </button>

                </div>

            ))}

            <button
                type="button"
                className="payroll-btn payroll-btn-light"
                onClick={addOvertimeRow}
            >
                <Plus size={16} />
                Ajouter des heures supplémentaires
            </button>


            {manualRubrics.length > 0 && (

                <>
                    <h4 className="payroll-subtitle">
                        Montants à saisir (laisser vide si non concerné)
                    </h4>

                    {manualRubrics.map((rubric) => (

                        <div
                            key={rubric.id}
                            className="payslip-editor-row"
                        >

                            <span className="payslip-editor-label">
                                {rubric.label}
                                <small>
                                    {CATEGORY_LABELS[rubric.category]}
                                </small>
                            </span>

                            <input
                                type="number"
                                min="0"
                                placeholder="Montant (FCFA)"
                                value={manualAmounts[rubric.id] ?? ""}
                                onChange={(e) =>
                                    setManualAmounts((previous) => ({
                                        ...previous,
                                        [rubric.id]: e.target.value
                                    }))
                                }
                            />

                        </div>

                    ))}
                </>
            )}


            <div className="payroll-field payslip-editor-notes">

                <label>Note du bulletin (optionnel)</label>

                <input
                    type="text"
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />

            </div>


            <div className="payroll-form-actions">

                <button
                    type="submit"
                    className="payroll-btn payroll-btn-primary"
                    disabled={saving}
                >
                    <Save size={16} />
                    {saving
                        ? "Calcul en cours..."
                        : "Enregistrer et recalculer"}
                </button>

            </div>

        </form>
    );
};


export default PayslipEditor;
