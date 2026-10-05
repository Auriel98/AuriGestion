import React, { useEffect, useState } from "react";
import {
    X,
    FileText,
    User,
    Calendar,
    Banknote,
    Briefcase,
    Clock
} from "lucide-react";

import api from "../../api/api";

import "./ContractModal.css";


const initialForm = {
    employee_id: "",
    contract_type: "CDI",
    contract_number: "",
    start_date: "",
    end_date: "",
    salary_base: "",
    position: "",
    trial_period_days: 0,
    status: "actif",
    notes: ""
};


const ContractModal = ({
    isOpen,
    onClose,
    onSuccess,
    contract = null
}) => {

    const [form, setForm] = useState(initialForm);

    const [employees, setEmployees] = useState([]);

    const [loadingEmployees, setLoadingEmployees] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");


    const isEditing = Boolean(contract);


    // =====================================================
    // CHARGER LES EMPLOYÉS
    // =====================================================

    useEffect(() => {

        if (!isOpen) return;

        const loadEmployees = async () => {

            try {

                setLoadingEmployees(true);

                const data =
                    await api.get("/contracts/employees");

                setEmployees(data);

            } catch (error) {

                console.error(error);

                setError(
                    "Impossible de charger les employés"
                );

            } finally {

                setLoadingEmployees(false);

            }
        };

        loadEmployees();

    }, [isOpen]);


    // =====================================================
    // INITIALISER LE FORMULAIRE
    // =====================================================

    useEffect(() => {

        if (!isOpen) return;

        setError("");

        if (contract) {

            setForm({
                employee_id:
                    contract.employee_id || "",

                contract_type:
                    contract.contract_type || "CDI",

                contract_number:
                    contract.contract_number || "",

                start_date:
                    contract.start_date
                        ? contract.start_date.substring(0, 10)
                        : "",

                end_date:
                    contract.end_date
                        ? contract.end_date.substring(0, 10)
                        : "",

                salary_base:
                    contract.salary_base || "",

                position:
                    contract.position || "",

                trial_period_days:
                    contract.trial_period_days || 0,

                status:
                    contract.status || "actif",

                notes:
                    contract.notes || ""
            });

        } else {

            setForm(initialForm);

        }

    }, [contract, isOpen]);


    // =====================================================
    // CHANGEMENT CHAMP
    // =====================================================

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));


        // Remplir automatiquement le poste
        // lorsqu'un employé est sélectionné

        if (name === "employee_id") {

            const employee =
                employees.find(
                    (item) => item.id === value
                );

            if (employee) {

                setForm((previous) => ({
                    ...previous,
                    employee_id: value,
                    position:
                        employee.position || ""
                }));

            }

        }

    };


    // =====================================================
    // SOUMISSION
    // =====================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");


        if (!form.employee_id) {

            setError(
                "Veuillez sélectionner un employé."
            );

            return;
        }


        if (!form.contract_type) {

            setError(
                "Veuillez sélectionner le type de contrat."
            );

            return;
        }


        if (!form.start_date) {

            setError(
                "La date de début est obligatoire."
            );

            return;
        }


        try {

            setSaving(true);


            const payload = {
                ...form,

                salary_base:
                    form.salary_base === ""
                        ? null
                        : Number(form.salary_base),

                trial_period_days:
                    form.trial_period_days === ""
                        ? 0
                        : Number(form.trial_period_days),

                end_date:
                    form.end_date || null,

                contract_number:
                    form.contract_number || null,

                position:
                    form.position || null,

                notes:
                    form.notes || null
            };


            if (isEditing) {

                await api.put(
                    `/contracts/${contract.id}`,
                    payload
                );

            } else {

                await api.post(
                    "/contracts",
                    payload
                );

            }


            onSuccess();

            onClose();

        } catch (error) {

            console.error(error);

            setError(
                error.message ||
                "Une erreur est survenue."
            );

        } finally {

            setSaving(false);

        }

    };


    if (!isOpen) return null;


    return (
        <div className="contract-modal-overlay">

            <div className="contract-modal">

                {/* HEADER */}

                <div className="contract-modal-header">

                    <div>

                        <div className="contract-modal-title-icon">
                            <FileText size={20} />
                        </div>

                        <div>

                            <h2>
                                {isEditing
                                    ? "Modifier le contrat"
                                    : "Nouveau contrat"}
                            </h2>

                            <p>
                                {isEditing
                                    ? "Modifier les informations du contrat"
                                    : "Créer un nouveau contrat employé"}
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="contract-modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>


                {/* ERREUR */}

                {error && (

                    <div className="contract-modal-error">
                        {error}
                    </div>

                )}


                {/* FORMULAIRE */}

                <form
                    className="contract-form"
                    onSubmit={handleSubmit}
                >

                    {/* EMPLOYÉ */}

                    <div className="contract-form-section">

                        <div className="contract-section-title">

                            <User size={17} />

                            <span>
                                Employé
                            </span>

                        </div>


                        <div className="contract-form-group">

                            <label>
                                Employé *
                            </label>

                            <select
                                name="employee_id"
                                value={form.employee_id}
                                onChange={handleChange}
                                disabled={
                                    loadingEmployees ||
                                    saving
                                }
                            >

                                <option value="">
                                    {loadingEmployees
                                        ? "Chargement..."
                                        : "Sélectionner un employé"}
                                </option>


                                {employees.map(
                                    (employee) => (

                                        <option
                                            key={employee.id}
                                            value={employee.id}
                                        >
                                            {employee.last_name}{" "}
                                            {employee.first_name}
                                            {" — "}
                                            {employee.matricule}
                                        </option>

                                    )
                                )}

                            </select>

                        </div>

                    </div>


                    {/* INFORMATIONS CONTRAT */}

                    <div className="contract-form-section">

                        <div className="contract-section-title">

                            <FileText size={17} />

                            <span>
                                Informations du contrat
                            </span>

                        </div>


                        <div className="contract-form-grid">

                            <div className="contract-form-group">

                                <label>
                                    Type de contrat *
                                </label>

                                <select
                                    name="contract_type"
                                    value={form.contract_type}
                                    onChange={handleChange}
                                >

                                    <option value="CDI">
                                        CDI
                                    </option>

                                    <option value="CDD">
                                        CDD
                                    </option>

                                    <option value="STAGE">
                                        Stage
                                    </option>

                                    <option value="INTERIM">
                                        Intérim
                                    </option>

                                    <option value="PRESTATION">
                                        Prestation
                                    </option>

                                    <option value="AUTRE">
                                        Autre
                                    </option>

                                </select>

                            </div>


                            <div className="contract-form-group">

                                <label>
                                    N° du contrat
                                </label>

                                <input
                                    type="text"
                                    name="contract_number"
                                    value={form.contract_number}
                                    onChange={handleChange}
                                    placeholder="Ex : CTR-2026-001"
                                />

                            </div>


                            <div className="contract-form-group">

                                <label>
                                    Date de début *
                                </label>

                                <div className="contract-input-icon">

                                    <Calendar size={16} />

                                    <input
                                        type="date"
                                        name="start_date"
                                        value={form.start_date}
                                        onChange={handleChange}
                                    />

                                </div>

                            </div>


                            <div className="contract-form-group">

                                <label>
                                    Date de fin
                                </label>

                                <div className="contract-input-icon">

                                    <Calendar size={16} />

                                    <input
                                        type="date"
                                        name="end_date"
                                        value={form.end_date}
                                        onChange={handleChange}
                                    />

                                </div>

                                <small>
                                    Laisser vide pour un CDI.
                                </small>

                            </div>

                        </div>

                    </div>


                    {/* CONDITIONS */}

                    <div className="contract-form-section">

                        <div className="contract-section-title">

                            <Banknote size={17} />

                            <span>
                                Conditions
                            </span>

                        </div>


                        <div className="contract-form-grid">

                            <div className="contract-form-group">

                                <label>
                                    Salaire de base
                                </label>

                                <div className="contract-input-icon">

                                    <Banknote size={16} />

                                    <input
                                        type="number"
                                        name="salary_base"
                                        value={form.salary_base}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                    />

                                </div>

                            </div>


                            <div className="contract-form-group">

                                <label>
                                    Poste
                                </label>

                                <div className="contract-input-icon">

                                    <Briefcase size={16} />

                                    <input
                                        type="text"
                                        name="position"
                                        value={form.position}
                                        onChange={handleChange}
                                        placeholder="Poste occupé"
                                    />

                                </div>

                            </div>


                            <div className="contract-form-group">

                                <label>
                                    Période d'essai
                                </label>

                                <div className="contract-input-icon">

                                    <Clock size={16} />

                                    <input
                                        type="number"
                                        name="trial_period_days"
                                        value={form.trial_period_days}
                                        onChange={handleChange}
                                        min="0"
                                        placeholder="0"
                                    />

                                </div>

                                <small>
                                    Nombre de jours.
                                </small>

                            </div>


                            <div className="contract-form-group">

                                <label>
                                    Statut
                                </label>

                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                >

                                    <option value="actif">
                                        Actif
                                    </option>

                                    <option value="termine">
                                        Terminé
                                    </option>

                                    <option value="suspendu">
                                        Suspendu
                                    </option>

                                    <option value="resilie">
                                        Résilié
                                    </option>

                                </select>

                            </div>

                        </div>

                    </div>


                    {/* NOTES */}

                    <div className="contract-form-section">

                        <div className="contract-section-title">

                            <FileText size={17} />

                            <span>
                                Notes
                            </span>

                        </div>


                        <div className="contract-form-group">

                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Informations complémentaires..."
                            />

                        </div>

                    </div>


                    {/* FOOTER */}

                    <div className="contract-modal-footer">

                        <button
                            type="button"
                            className="contract-btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Annuler
                        </button>


                        <button
                            type="submit"
                            className="contract-btn-primary"
                            disabled={saving}
                        >

                            {saving
                                ? "Enregistrement..."
                                : isEditing
                                    ? "Enregistrer les modifications"
                                    : "Créer le contrat"}

                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};


export default ContractModal;