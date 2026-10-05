import React, { useEffect, useState } from "react";
import { Plus, Pencil, Ban } from "lucide-react";

import api from "../../api/api";
import PayrollModal from "./PayrollModal";


const EMPTY_FORM = {
    code: "",
    label: "",
    major_percent: "",
    display_order: 0,
    is_active: true
};


const OvertimeTab = () => {

    const [types, setTypes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState(null);

    const [saving, setSaving] = useState(false);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    const load = async () => {

        try {

            const response = await api.get("/payroll/overtime-types");

            setTypes(response.overtime_types || []);

        } catch (error) {

            alert(
                error.message ||
                "Impossible de charger les heures supplémentaires."
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


    const openEdit = (type) => {

        setEditingId(type.id);

        setForm({
            code: type.code,
            label: type.label,
            major_percent: type.major_percent,
            display_order: type.display_order,
            is_active: type.is_active
        });
    };


    const handleChange = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        const payload = {
            code: form.code.trim(),
            label: form.label.trim(),
            major_percent: form.major_percent,
            display_order: Number(form.display_order) || 0,
            is_active: form.is_active
        };

        try {

            setSaving(true);

            if (editingId) {
                await api.put(
                    `/payroll/overtime-types/${editingId}`,
                    payload
                );
            } else {
                await api.post("/payroll/overtime-types", payload);
            }

            setForm(null);

            await load();

        } catch (error) {

            alert(
                error.message ||
                "Impossible d'enregistrer le type."
            );

        } finally {

            setSaving(false);
        }
    };


    const handleDeactivate = async (type) => {

        if (
            !window.confirm(
                `Désactiver le type "${type.label}" ?`
            )
        ) {
            return;
        }

        try {

            await api.delete(`/payroll/overtime-types/${type.id}`);

            await load();

        } catch (error) {

            alert(
                error.message ||
                "Impossible de désactiver le type."
            );
        }
    };


    if (loading) {
        return (
            <div className="payroll-loading">
                Chargement des heures supplémentaires...
            </div>
        );
    }


    return (
        <div>

            <div className="payroll-toolbar">

                <p className="payroll-hint">
                    Les heures supplémentaires sont saisies sur le
                    bulletin, jamais déduites du pointage. Chaque type a
                    sa majoration (ex : 25 = taux horaire × 1,25).
                </p>

                <button
                    className="payroll-btn payroll-btn-primary"
                    onClick={openCreate}
                >
                    <Plus size={16} />
                    Nouveau type
                </button>

            </div>


            <div className="payroll-card">

                <div className="payroll-table-wrapper">

                    <table className="payroll-table">

                        <thead>

                            <tr>
                                <th>Code</th>
                                <th>Libellé</th>
                                <th>Majoration</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>

                        </thead>

                        <tbody>

                            {types.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan="5"
                                        className="payroll-empty"
                                    >
                                        Aucun type d'heures supplémentaires.
                                    </td>
                                </tr>

                            ) : (

                                types.map((type) => (

                                    <tr
                                        key={type.id}
                                        className={
                                            type.is_active
                                                ? ""
                                                : "payroll-row-inactive"
                                        }
                                    >

                                        <td>
                                            <strong>{type.code}</strong>
                                        </td>

                                        <td>{type.label}</td>

                                        <td>+ {type.major_percent} %</td>

                                        <td>
                                            {type.is_active
                                                ? "Actif"
                                                : "Inactif"}
                                        </td>

                                        <td>

                                            <div className="payroll-row-actions">

                                                <button
                                                    className="payroll-icon-btn"
                                                    title="Modifier"
                                                    onClick={() =>
                                                        openEdit(type)
                                                    }
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                {type.is_active && (
                                                    <button
                                                        className="payroll-icon-btn payroll-icon-danger"
                                                        title="Désactiver"
                                                        onClick={() =>
                                                            handleDeactivate(
                                                                type
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
                            ? "Modifier le type"
                            : "Nouveau type d'heures supplémentaires"
                    }
                    onClose={() => setForm(null)}
                >

                    <form onSubmit={handleSubmit}>

                        <div className="payroll-grid-2">

                            <div className="payroll-field">

                                <label>Code</label>

                                <input
                                    type="text"
                                    maxLength={30}
                                    value={form.code}
                                    onChange={(e) =>
                                        handleChange("code", e.target.value)
                                    }
                                    required
                                />

                            </div>

                            <div className="payroll-field">

                                <label>Majoration (%)</label>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.major_percent}
                                    onChange={(e) =>
                                        handleChange(
                                            "major_percent",
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                            </div>

                        </div>


                        <div className="payroll-field">

                            <label>Libellé</label>

                            <input
                                type="text"
                                maxLength={150}
                                placeholder="Ex : Heures de nuit"
                                value={form.label}
                                onChange={(e) =>
                                    handleChange("label", e.target.value)
                                }
                                required
                            />

                        </div>


                        <div className="payroll-grid-2">

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

                            <div className="payroll-checks">

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


export default OvertimeTab;
