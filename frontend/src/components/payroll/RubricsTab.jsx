import React, { useEffect, useState } from "react";
import { Plus, Pencil, Ban } from "lucide-react";

import api from "../../api/api";
import PayrollModal from "./PayrollModal";

import {
    CATEGORY_LABELS,
    CATEGORY_HELP,
    CALC_LABELS,
    BASE_LABELS,
    CALC_OPTIONS_BY_CATEGORY,
    BASE_OPTIONS_BY_CATEGORY,
    formatMoney
} from "./payrollLabels";


const EMPTY_FORM = {
    code: "",
    label: "",
    category: "earning",
    calc_type: "fixed",
    base_type: "",
    rate: "",
    fixed_amount: "",
    ceiling_amount: "",
    floor_amount: "",
    tax_scale_id: "",
    subject_to_social: true,
    subject_to_tax: true,
    deductible_for_tax: false,
    display_order: 0,
    is_active: true
};


const RubricsTab = () => {

    const [rubrics, setRubrics] = useState([]);

    const [scales, setScales] = useState([]);

    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState("");

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState(null);

    const [saving, setSaving] = useState(false);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    const load = async () => {

        try {

            const [rubricsResponse, scalesResponse] =
                await Promise.all([
                    api.get("/payroll/rubrics"),
                    api.get("/payroll/scales")
                ]);

            setRubrics(rubricsResponse.rubrics || []);

            setScales(scalesResponse.scales || []);

        } catch (error) {

            alert(
                error.message ||
                "Impossible de charger les rubriques."
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
        setForm({ ...EMPTY_FORM });
    };


    const openEdit = (rubric) => {

        setEditingId(rubric.id);

        setForm({
            code: rubric.code,
            label: rubric.label,
            category: rubric.category,
            calc_type: rubric.calc_type,
            base_type: rubric.base_type ?? "",
            rate: rubric.rate ?? "",
            fixed_amount: rubric.fixed_amount ?? "",
            ceiling_amount: rubric.ceiling_amount ?? "",
            floor_amount: rubric.floor_amount ?? "",
            tax_scale_id: rubric.tax_scale_id ?? "",
            subject_to_social: rubric.subject_to_social,
            subject_to_tax: rubric.subject_to_tax,
            deductible_for_tax: rubric.deductible_for_tax,
            display_order: rubric.display_order,
            is_active: rubric.is_active
        });
    };


    const handleChange = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };


    // Changer de catégorie remet un mode de calcul valide
    const handleCategoryChange = (category) => {

        setForm((previous) => {

            const calcOptions = CALC_OPTIONS_BY_CATEGORY[category];

            const baseOptions = BASE_OPTIONS_BY_CATEGORY[category];

            return {
                ...previous,
                category,
                calc_type: calcOptions.includes(previous.calc_type)
                    ? previous.calc_type
                    : calcOptions[0],
                base_type: baseOptions.includes(previous.base_type)
                    ? previous.base_type
                    : ""
            };
        });
    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        const isPercent = form.calc_type === "percent";

        const payload = {
            code: form.code.trim(),
            label: form.label.trim(),
            category: form.category,
            calc_type: form.calc_type,
            base_type: isPercent ? form.base_type : "",
            rate: isPercent ? form.rate : "",
            fixed_amount:
                form.calc_type === "fixed" ? form.fixed_amount : "",
            ceiling_amount: isPercent ? form.ceiling_amount : "",
            floor_amount: isPercent ? form.floor_amount : "",
            tax_scale_id:
                form.calc_type === "bracket" ? form.tax_scale_id : "",
            subject_to_social: form.subject_to_social,
            subject_to_tax: form.subject_to_tax,
            deductible_for_tax: form.deductible_for_tax,
            display_order: Number(form.display_order) || 0,
            is_active: form.is_active
        };

        try {

            setSaving(true);

            if (editingId) {
                await api.put(`/payroll/rubrics/${editingId}`, payload);
            } else {
                await api.post("/payroll/rubrics", payload);
            }

            setForm(null);

            await load();

        } catch (error) {

            alert(
                error.message ||
                "Impossible d'enregistrer la rubrique."
            );

        } finally {

            setSaving(false);
        }
    };


    const handleDeactivate = async (rubric) => {

        if (
            !window.confirm(
                `Désactiver la rubrique "${rubric.label}" ? Les anciens bulletins ne changent pas.`
            )
        ) {
            return;
        }

        try {

            await api.delete(`/payroll/rubrics/${rubric.id}`);

            await load();

        } catch (error) {

            alert(
                error.message ||
                "Impossible de désactiver la rubrique."
            );
        }
    };


    // =====================================================
    // AFFICHAGE
    // =====================================================

    const describeCalc = (rubric) => {

        if (rubric.calc_type === "percent") {
            return `${rubric.rate} % de ${BASE_LABELS[rubric.base_type] || "—"}`;
        }

        if (rubric.calc_type === "fixed") {
            return rubric.fixed_amount !== null
                ? formatMoney(rubric.fixed_amount)
                : "Montant défini par employé";
        }

        if (rubric.calc_type === "bracket") {
            const scale = scales.find(
                (item) => item.id === rubric.tax_scale_id
            );
            return scale ? `Barème : ${scale.name}` : "Barème";
        }

        return CALC_LABELS[rubric.calc_type];
    };


    const visibleRubrics = rubrics.filter(
        (rubric) => !filter || rubric.category === filter
    );


    if (loading) {
        return (
            <div className="payroll-loading">
                Chargement des rubriques...
            </div>
        );
    }


    const calcOptions = form
        ? CALC_OPTIONS_BY_CATEGORY[form.category]
        : [];

    const baseOptions = form
        ? BASE_OPTIONS_BY_CATEGORY[form.category]
        : [];


    return (
        <div>

            <div className="payroll-toolbar">

                <select
                    className="payroll-select"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >

                    <option value="">Toutes les catégories</option>

                    {Object.entries(CATEGORY_LABELS).map(
                        ([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        )
                    )}

                </select>

                <button
                    className="payroll-btn payroll-btn-primary"
                    onClick={openCreate}
                >
                    <Plus size={16} />
                    Nouvelle rubrique
                </button>

            </div>


            <div className="payroll-card">

                <div className="payroll-table-wrapper">

                    <table className="payroll-table">

                        <thead>

                            <tr>
                                <th>Code</th>
                                <th>Libellé</th>
                                <th>Catégorie</th>
                                <th>Calcul</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>

                        </thead>

                        <tbody>

                            {visibleRubrics.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan="6"
                                        className="payroll-empty"
                                    >
                                        Aucune rubrique. Crée au moins
                                        les cotisations (CNSS, CNAMGS...).
                                    </td>
                                </tr>

                            ) : (

                                visibleRubrics.map((rubric) => (

                                    <tr
                                        key={rubric.id}
                                        className={
                                            rubric.is_active
                                                ? ""
                                                : "payroll-row-inactive"
                                        }
                                    >

                                        <td>
                                            <strong>{rubric.code}</strong>
                                        </td>

                                        <td>{rubric.label}</td>

                                        <td>
                                            <span
                                                className={`payroll-badge badge-${rubric.category}`}
                                            >
                                                {CATEGORY_LABELS[rubric.category]}
                                            </span>
                                        </td>

                                        <td>{describeCalc(rubric)}</td>

                                        <td>
                                            {rubric.is_active
                                                ? "Actif"
                                                : "Inactif"}
                                        </td>

                                        <td>

                                            <div className="payroll-row-actions">

                                                <button
                                                    className="payroll-icon-btn"
                                                    title="Modifier"
                                                    onClick={() =>
                                                        openEdit(rubric)
                                                    }
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                {rubric.is_active && (
                                                    <button
                                                        className="payroll-icon-btn payroll-icon-danger"
                                                        title="Désactiver"
                                                        onClick={() =>
                                                            handleDeactivate(
                                                                rubric
                                                            )
                                                        }
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {form && (

                <PayrollModal
                    title={
                        editingId
                            ? "Modifier la rubrique"
                            : "Nouvelle rubrique"
                    }
                    onClose={() => setForm(null)}
                >

                    <form onSubmit={handleSubmit}>

                        <div className="payroll-grid-2">

                            <div className="payroll-field">

                                <label>Code</label>

                                <input
                                    type="text"
                                    maxLength={20}
                                    value={form.code}
                                    onChange={(e) =>
                                        handleChange("code", e.target.value)
                                    }
                                    required
                                />

                            </div>

                            <div className="payroll-field">

                                <label>Libellé</label>

                                <input
                                    type="text"
                                    maxLength={150}
                                    value={form.label}
                                    onChange={(e) =>
                                        handleChange("label", e.target.value)
                                    }
                                    required
                                />

                            </div>

                        </div>


                        <div className="payroll-field">

                            <label>Catégorie</label>

                            <select
                                value={form.category}
                                onChange={(e) =>
                                    handleCategoryChange(e.target.value)
                                }
                            >
                                {Object.entries(CATEGORY_LABELS).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>

                            <small>{CATEGORY_HELP[form.category]}</small>

                        </div>


                        <div className="payroll-field">

                            <label>Mode de calcul</label>

                            <select
                                value={form.calc_type}
                                onChange={(e) =>
                                    handleChange("calc_type", e.target.value)
                                }
                            >
                                {calcOptions.map((value) => (
                                    <option key={value} value={value}>
                                        {CALC_LABELS[value]}
                                    </option>
                                ))}
                            </select>

                        </div>


                        {form.calc_type === "percent" && (

                            <>
                                <div className="payroll-grid-2">

                                    <div className="payroll-field">

                                        <label>Base de calcul</label>

                                        <select
                                            value={form.base_type}
                                            onChange={(e) =>
                                                handleChange(
                                                    "base_type",
                                                    e.target.value
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                — Choisir —
                                            </option>

                                            {baseOptions.map((value) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {BASE_LABELS[value]}
                                                </option>
                                            ))}
                                        </select>

                                    </div>

                                    <div className="payroll-field">

                                        <label>Taux (%)</label>

                                        <input
                                            type="number"
                                            step="0.0001"
                                            min="0"
                                            max="100"
                                            value={form.rate}
                                            onChange={(e) =>
                                                handleChange(
                                                    "rate",
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />

                                    </div>

                                </div>

                                <div className="payroll-grid-2">

                                    <div className="payroll-field">

                                        <label>Plafond de la base (optionnel)</label>

                                        <input
                                            type="number"
                                            min="0"
                                            value={form.ceiling_amount}
                                            onChange={(e) =>
                                                handleChange(
                                                    "ceiling_amount",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                    <div className="payroll-field">

                                        <label>Plancher de la base (optionnel)</label>

                                        <input
                                            type="number"
                                            min="0"
                                            value={form.floor_amount}
                                            onChange={(e) =>
                                                handleChange(
                                                    "floor_amount",
                                                    e.target.value
                                                )
                                            }
                                        />

                                    </div>

                                </div>
                            </>
                        )}


                        {form.calc_type === "fixed" && (

                            <div className="payroll-field">

                                <label>
                                    Montant fixe par défaut (optionnel)
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.fixed_amount}
                                    onChange={(e) =>
                                        handleChange(
                                            "fixed_amount",
                                            e.target.value
                                        )
                                    }
                                />

                                <small>
                                    Peut être remplacé employé par employé.
                                </small>

                            </div>
                        )}


                        {form.calc_type === "bracket" && (

                            <div className="payroll-field">

                                <label>Barème</label>

                                <select
                                    value={form.tax_scale_id}
                                    onChange={(e) =>
                                        handleChange(
                                            "tax_scale_id",
                                            e.target.value
                                        )
                                    }
                                    required
                                >
                                    <option value="">— Choisir —</option>

                                    {scales
                                        .filter((scale) => scale.is_active)
                                        .map((scale) => (
                                            <option
                                                key={scale.id}
                                                value={scale.id}
                                            >
                                                {scale.name}
                                            </option>
                                        ))}
                                </select>

                                <small>
                                    Crée d'abord le barème dans l'onglet
                                    « Barèmes ».
                                </small>

                            </div>
                        )}


                        <div className="payroll-checks">

                            {form.category === "earning" && (
                                <>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={form.subject_to_social}
                                            onChange={(e) =>
                                                handleChange(
                                                    "subject_to_social",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        Soumis aux cotisations
                                    </label>

                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={form.subject_to_tax}
                                            onChange={(e) =>
                                                handleChange(
                                                    "subject_to_tax",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        Imposable
                                    </label>
                                </>
                            )}

                            {form.category === "employee_contribution" && (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={form.deductible_for_tax}
                                        onChange={(e) =>
                                            handleChange(
                                                "deductible_for_tax",
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Déductible de la base imposable
                                </label>
                            )}

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
                                Active
                            </label>

                        </div>


                        <div className="payroll-field">

                            <label>Ordre d'affichage</label>

                            <input
                                type="number"
                                value={form.display_order}
                                onChange={(e) =>
                                    handleChange(
                                        "display_order",
                                        e.target.value
                                    )
                                }
                            />

                        </div>


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


export default RubricsTab;
