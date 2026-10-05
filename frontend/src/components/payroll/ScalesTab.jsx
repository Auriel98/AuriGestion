import React, { useEffect, useState } from "react";
import { Plus, Pencil, Ban, Trash2 } from "lucide-react";

import api from "../../api/api";
import PayrollModal from "./PayrollModal";

import { PERIOD_LABELS, formatMoney } from "./payrollLabels";


const EMPTY_BRACKET = {
    lower_bound: 0,
    upper_bound: "",
    rate: ""
};

const EMPTY_FORM = {
    code: "",
    name: "",
    description: "",
    period_basis: "monthly",
    abatement_rate: 0,
    abatement_min: "",
    abatement_max: "",
    use_family_parts: false,
    is_active: true,
    brackets: [{ ...EMPTY_BRACKET }]
};


const ScalesTab = () => {

    const [scales, setScales] = useState([]);

    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState(null);

    const [saving, setSaving] = useState(false);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    const load = async () => {

        try {

            const response = await api.get("/payroll/scales");

            setScales(response.scales || []);

        } catch (error) {

            alert(
                error.message ||
                "Impossible de charger les barèmes."
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        load();
    }, []);


    // =====================================================
    // FORMULAIRE
    // =====================================================

    const openCreate = () => {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            brackets: [{ ...EMPTY_BRACKET }]
        });
    };


    const openEdit = (scale) => {

        setEditingId(scale.id);

        setForm({
            code: scale.code,
            name: scale.name,
            description: scale.description ?? "",
            period_basis: scale.period_basis,
            abatement_rate: scale.abatement_rate,
            abatement_min: scale.abatement_min ?? "",
            abatement_max: scale.abatement_max ?? "",
            use_family_parts: scale.use_family_parts,
            is_active: scale.is_active,
            brackets: scale.brackets.map((bracket) => ({
                lower_bound: bracket.lower_bound,
                upper_bound: bracket.upper_bound ?? "",
                rate: bracket.rate
            }))
        });
    };


    const handleChange = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };


    const handleBracketChange = (index, field, value) => {

        setForm((previous) => ({
            ...previous,
            brackets: previous.brackets.map((bracket, i) =>
                i === index
                    ? { ...bracket, [field]: value }
                    : bracket
            )
        }));
    };


    // Nouvelle tranche : commence là où la précédente s'arrête
    const addBracket = () => {

        setForm((previous) => {

            const last = previous.brackets[previous.brackets.length - 1];

            return {
                ...previous,
                brackets: [
                    ...previous.brackets,
                    {
                        lower_bound:
                            last && last.upper_bound !== ""
                                ? last.upper_bound
                                : "",
                        upper_bound: "",
                        rate: ""
                    }
                ]
            };
        });
    };


    const removeBracket = (index) => {

        setForm((previous) => ({
            ...previous,
            brackets: previous.brackets.filter((_, i) => i !== index)
        }));
    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        const payload = {
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description,
            period_basis: form.period_basis,
            abatement_rate: form.abatement_rate,
            abatement_min: form.abatement_min,
            abatement_max: form.abatement_max,
            use_family_parts: form.use_family_parts,
            is_active: form.is_active,
            brackets: form.brackets.map((bracket) => ({
                lower_bound: bracket.lower_bound,
                upper_bound: bracket.upper_bound,
                rate: bracket.rate
            }))
        };

        try {

            setSaving(true);

            if (editingId) {
                await api.put(`/payroll/scales/${editingId}`, payload);
            } else {
                await api.post("/payroll/scales", payload);
            }

            setForm(null);

            await load();

        } catch (error) {

            alert(
                error.message ||
                "Impossible d'enregistrer le barème."
            );

        } finally {

            setSaving(false);
        }
    };


    const handleDeactivate = async (scale) => {

        if (
            !window.confirm(
                `Désactiver le barème "${scale.name}" ?`
            )
        ) {
            return;
        }

        try {

            await api.delete(`/payroll/scales/${scale.id}`);

            await load();

        } catch (error) {

            alert(
                error.message ||
                "Impossible de désactiver le barème."
            );
        }
    };


    if (loading) {
        return (
            <div className="payroll-loading">
                Chargement des barèmes...
            </div>
        );
    }


    return (
        <div>

            <div className="payroll-toolbar">

                <p className="payroll-hint">
                    Les barèmes servent aux impôts progressifs (IRPP, TCS...).
                    Ils sont ensuite choisis dans une rubrique de type Impôt.
                </p>

                <button
                    className="payroll-btn payroll-btn-primary"
                    onClick={openCreate}
                >
                    <Plus size={16} />
                    Nouveau barème
                </button>

            </div>


            {scales.length === 0 ? (

                <div className="payroll-card payroll-empty">
                    Aucun barème pour l'instant.
                </div>

            ) : (

                scales.map((scale) => (

                    <div
                        key={scale.id}
                        className={`payroll-card payroll-scale ${
                            scale.is_active ? "" : "payroll-row-inactive"
                        }`}
                    >

                        <div className="payroll-scale-header">

                            <div>

                                <h3>
                                    {scale.name}{" "}
                                    <span className="payroll-code">
                                        {scale.code}
                                    </span>
                                </h3>

                                <p>
                                    {PERIOD_LABELS[scale.period_basis]}
                                    {" · "}
                                    Abattement : {scale.abatement_rate} %
                                    {scale.use_family_parts
                                        ? " · Quotient familial"
                                        : ""}
                                    {scale.is_active ? "" : " · Inactif"}
                                </p>

                            </div>

                            <div className="payroll-row-actions">

                                <button
                                    className="payroll-icon-btn"
                                    title="Modifier"
                                    onClick={() => openEdit(scale)}
                                >
                                    <Pencil size={16} />
                                </button>

                                {scale.is_active && (
                                    <button
                                        className="payroll-icon-btn payroll-icon-danger"
                                        title="Désactiver"
                                        onClick={() =>
                                            handleDeactivate(scale)
                                        }
                                    >
                                        <Ban size={16} />
                                    </button>
                                )}

                            </div>

                        </div>

                        <table className="payroll-table payroll-table-small">

                            <thead>

                                <tr>
                                    <th>De</th>
                                    <th>À</th>
                                    <th>Taux</th>
                                </tr>

                            </thead>

                            <tbody>

                                {scale.brackets.map((bracket) => (

                                    <tr key={bracket.id}>

                                        <td>
                                            {formatMoney(bracket.lower_bound)}
                                        </td>

                                        <td>
                                            {bracket.upper_bound !== null
                                                ? formatMoney(
                                                    bracket.upper_bound
                                                )
                                                : "Sans limite"}
                                        </td>

                                        <td>{bracket.rate} %</td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                ))

            )}


            {form && (

                <PayrollModal
                    title={
                        editingId
                            ? "Modifier le barème"
                            : "Nouveau barème"
                    }
                    onClose={() => setForm(null)}
                    wide
                >

                    <form onSubmit={handleSubmit}>

                        <div className="payroll-grid-2">

                            <div className="payroll-field">

                                <label>Code</label>

                                <input
                                    type="text"
                                    maxLength={50}
                                    value={form.code}
                                    onChange={(e) =>
                                        handleChange("code", e.target.value)
                                    }
                                    required
                                />

                            </div>

                            <div className="payroll-field">

                                <label>Nom</label>

                                <input
                                    type="text"
                                    maxLength={150}
                                    value={form.name}
                                    onChange={(e) =>
                                        handleChange("name", e.target.value)
                                    }
                                    required
                                />

                            </div>

                        </div>


                        <div className="payroll-field">

                            <label>Description (optionnel)</label>

                            <input
                                type="text"
                                maxLength={500}
                                value={form.description}
                                onChange={(e) =>
                                    handleChange(
                                        "description",
                                        e.target.value
                                    )
                                }
                            />

                        </div>


                        <div className="payroll-grid-2">

                            <div className="payroll-field">

                                <label>Les tranches s'appliquent sur</label>

                                <select
                                    value={form.period_basis}
                                    onChange={(e) =>
                                        handleChange(
                                            "period_basis",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="monthly">
                                        Une base mensuelle
                                    </option>

                                    <option value="annual">
                                        Une base annuelle (mensuel × 12)
                                    </option>
                                </select>

                            </div>

                            <div className="payroll-field">

                                <label>Abattement (%)</label>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={form.abatement_rate}
                                    onChange={(e) =>
                                        handleChange(
                                            "abatement_rate",
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        <div className="payroll-grid-2">

                            <div className="payroll-field">

                                <label>Abattement minimum (optionnel)</label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.abatement_min}
                                    onChange={(e) =>
                                        handleChange(
                                            "abatement_min",
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <div className="payroll-field">

                                <label>Abattement maximum (optionnel)</label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.abatement_max}
                                    onChange={(e) =>
                                        handleChange(
                                            "abatement_max",
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        <div className="payroll-checks">

                            <label>
                                <input
                                    type="checkbox"
                                    checked={form.use_family_parts}
                                    onChange={(e) =>
                                        handleChange(
                                            "use_family_parts",
                                            e.target.checked
                                        )
                                    }
                                />
                                Utiliser le quotient familial (parts
                                fiscales de l'employé)
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) =>
                                        handleChange(
                                            "is_active",
                                            e.target.checked
                                        )
                                    }
                                />
                                Actif
                            </label>

                        </div>


                        <h4 className="payroll-subtitle">Tranches</h4>

                        <table className="payroll-table payroll-table-small">

                            <thead>

                                <tr>
                                    <th>De (inclus)</th>
                                    <th>À (vide = sans limite)</th>
                                    <th>Taux (%)</th>
                                    <th></th>
                                </tr>

                            </thead>

                            <tbody>

                                {form.brackets.map((bracket, index) => (

                                    <tr key={index}>

                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={bracket.lower_bound}
                                                onChange={(e) =>
                                                    handleBracketChange(
                                                        index,
                                                        "lower_bound",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={bracket.upper_bound}
                                                onChange={(e) =>
                                                    handleBracketChange(
                                                        index,
                                                        "upper_bound",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={bracket.rate}
                                                onChange={(e) =>
                                                    handleBracketChange(
                                                        index,
                                                        "rate",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </td>

                                        <td>
                                            {form.brackets.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="payroll-icon-btn payroll-icon-danger"
                                                    title="Supprimer la tranche"
                                                    onClick={() =>
                                                        removeBracket(index)
                                                    }
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                        <button
                            type="button"
                            className="payroll-btn payroll-btn-light"
                            onClick={addBracket}
                        >
                            <Plus size={16} />
                            Ajouter une tranche
                        </button>


                        <div className="payroll-modal-footer">

                            <button
                                type="button"
                                className="payroll-btn"
                                onClick={() => setForm(null)}
                            >
                                Annuler
                            </button>

                            <button
                                type="submit"
                                className="payroll-btn payroll-btn-primary"
                                disabled={saving}
                            >
                                {saving ? "Enregistrement..." : "Enregistrer"}
                            </button>

                        </div>

                    </form>

                </PayrollModal>

            )}

        </div>
    );
};


export default ScalesTab;
