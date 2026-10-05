import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";

import api from "../../api/api";


const GeneralSettings = () => {

    const [form, setForm] = useState({
        payroll_monthly_hours: "",
        payroll_days_basis: "",
        payroll_rounding_step: ""
    });

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [saved, setSaved] = useState(false);


    useEffect(() => {

        const load = async () => {

            try {

                const data = await api.get("/payroll/settings");

                setForm({
                    payroll_monthly_hours: data.payroll_monthly_hours,
                    payroll_days_basis: data.payroll_days_basis,
                    payroll_rounding_step: data.payroll_rounding_step
                });

            } catch (error) {

                alert(
                    error.message ||
                    "Impossible de charger les paramètres."
                );

            } finally {

                setLoading(false);
            }
        };

        load();
    }, []);


    const handleChange = (field, value) => {
        setSaved(false);
        setForm((previous) => ({ ...previous, [field]: value }));
    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setSaving(true);

            await api.put("/payroll/settings", form);

            setSaved(true);

        } catch (error) {

            alert(
                error.message ||
                "Impossible d'enregistrer les paramètres."
            );

        } finally {

            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="payroll-loading">
                Chargement des paramètres...
            </div>
        );
    }


    return (
        <form
            className="payroll-card payroll-form-card"
            onSubmit={handleSubmit}
        >

            <h3>Paramètres généraux de la paie</h3>

            <div className="payroll-field">

                <label>Heures mensuelles de référence</label>

                <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={form.payroll_monthly_hours}
                    onChange={(e) =>
                        handleChange(
                            "payroll_monthly_hours",
                            e.target.value
                        )
                    }
                    required
                />

                <small>
                    Sert à calculer le taux horaire des heures
                    supplémentaires : salaire de base ÷ ces heures.
                </small>

            </div>

            <div className="payroll-field">

                <label>Jours de référence du mois</label>

                <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.payroll_days_basis}
                    onChange={(e) =>
                        handleChange(
                            "payroll_days_basis",
                            e.target.value
                        )
                    }
                    required
                />

                <small>
                    Le salaire de base est proratisé selon les jours
                    payés sur ce nombre (ex : 30).
                </small>

            </div>

            <div className="payroll-field">

                <label>Arrondi du net à payer (FCFA)</label>

                <input
                    type="number"
                    min="1"
                    value={form.payroll_rounding_step}
                    onChange={(e) =>
                        handleChange(
                            "payroll_rounding_step",
                            e.target.value
                        )
                    }
                    required
                />

                <small>
                    1 = pas d'arrondi. Avec 10, le net est arrondi au
                    multiple de 10 le plus proche.
                </small>

            </div>

            <div className="payroll-form-actions">

                {saved && (
                    <span className="payroll-saved">
                        Enregistré
                    </span>
                )}

                <button
                    type="submit"
                    className="payroll-btn payroll-btn-primary"
                    disabled={saving}
                >
                    <Save size={16} />
                    {saving ? "Enregistrement..." : "Enregistrer"}
                </button>

            </div>

        </form>
    );
};


export default GeneralSettings;
