import React, { useEffect, useState } from "react";

import {
    X,
    User,
    Briefcase,
    FileText,
    Save,
} from "lucide-react";

import api from "../../api/api";

import "./EmployeeModal.css";


const initialForm = {
    matricule: "",
    first_name: "",
    last_name: "",

    email: "",
    phone: "",

    birth_date: "",
    birth_place: "",

    nationality: "Gabonaise",
    marital_status: "",
    children_count: 0,

    cnss_number: "",

    position: "",
    hire_date: "",

    service_id: "",
};


const EmployeeModal = ({
    isOpen,
    employee,
    onClose,
    onSuccess,
}) => {

    const [form, setForm] =
        useState(initialForm);

    const [services, setServices] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [loadingServices, setLoadingServices] =
        useState(false);

    const [error, setError] =
        useState("");


    const isEdit =
        Boolean(employee);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    useEffect(() => {

        if (!isOpen) {
            return;
        }

        loadServices();

        if (employee) {

            setForm({
                matricule:
                    employee.matricule || "",

                first_name:
                    employee.first_name || "",

                last_name:
                    employee.last_name || "",

                email:
                    employee.email || "",

                phone:
                    employee.phone || "",

                birth_date:
                    employee.birth_date
                        ? employee.birth_date.substring(0, 10)
                        : "",

                birth_place:
                    employee.birth_place || "",

                nationality:
                    employee.nationality ||
                    "Gabonaise",

                marital_status:
                    employee.marital_status || "",

                children_count:
                    employee.children_count ?? 0,

                cnss_number:
                    employee.cnss_number || "",

                position:
                    employee.position || "",

                hire_date:
                    employee.hire_date
                        ? employee.hire_date.substring(0, 10)
                        : "",

                service_id:
                    employee.service_id || "",
            });

        } else {

            setForm(initialForm);
        }

        setError("");

    }, [isOpen, employee]);


    // =====================================================
    // SERVICES
    // =====================================================

    const loadServices = async () => {

        try {

            setLoadingServices(true);

            /*
             * On utilise ici l'API des services.
             * Si la route est différente dans ton backend,
             * on l'adaptera.
             */

            const response =
                await api.get("/services");

            setServices(response);

        } catch (error) {

            console.error(
                "Erreur chargement services :",
                error
            );

        } finally {

            setLoadingServices(false);
        }
    };


    // =====================================================
    // CHANGEMENT FORMULAIRE
    // =====================================================

    const handleChange = (event) => {

        const {
            name,
            value,
        } = event.target;


        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };


    // =====================================================
    // SOUMISSION
    // =====================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");


        if (
            !form.matricule ||
            !form.first_name ||
            !form.last_name
        ) {

            setError(
                "Le matricule, le prénom et le nom sont obligatoires."
            );

            return;
        }


        try {

            setLoading(true);


            const payload = {
                ...form,

                children_count:
                    Number(form.children_count) || 0,

                service_id:
                    form.service_id || null,
            };


            if (isEdit) {

                await api.put(
                    `/employees/${employee.id}`,
                    payload
                );

            } else {

                await api.post(
                    "/employees",
                    payload
                );
            }


            onSuccess();

        } catch (error) {

            console.error(
                "Erreur sauvegarde employé :",
                error
            );

            setError(
                error.message ||
                "Une erreur est survenue."
            );

        } finally {

            setLoading(false);
        }
    };


    if (!isOpen) {
        return null;
    }


    return (

        <div
            className="modal-overlay"
            onMouseDown={(event) => {

                if (
                    event.target === event.currentTarget
                ) {
                    onClose();
                }

            }}
        >

            <div className="employee-modal">


                {/* HEADER */}

                <div className="employee-modal-header">

                    <div>

                        <h2>
                            {isEdit
                                ? "Modifier l'employé"
                                : "Nouvel employé"}
                        </h2>

                        <p>
                            {isEdit
                                ? "Modifiez les informations de l'employé."
                                : "Ajoutez un nouvel employé à votre entreprise."}
                        </p>

                    </div>


                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>


                {/* ERREUR */}

                {error && (

                    <div className="form-error">
                        {error}
                    </div>

                )}


                <form
                    onSubmit={handleSubmit}
                    className="employee-form"
                >


                    {/* ================================
                        INFORMATIONS PERSONNELLES
                    ================================= */}

                    <div className="form-section">

                        <div className="form-section-title">

                            <div className="section-icon">
                                <User size={17} />
                            </div>

                            <div>

                                <h3>
                                    Informations personnelles
                                </h3>

                                <p>
                                    Identité et informations personnelles
                                </p>

                            </div>

                        </div>


                        <div className="form-grid">


                            <div className="form-group">

                                <label>
                                    Prénom *
                                </label>

                                <input
                                    name="first_name"
                                    value={form.first_name}
                                    onChange={handleChange}
                                    placeholder="Ex. Ghislain"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Nom *
                                </label>

                                <input
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    placeholder="Ex. Ondeno"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Date de naissance
                                </label>

                                <input
                                    type="date"
                                    name="birth_date"
                                    value={form.birth_date}
                                    onChange={handleChange}
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Lieu de naissance
                                </label>

                                <input
                                    name="birth_place"
                                    value={form.birth_place}
                                    onChange={handleChange}
                                    placeholder="Ex. Libreville"
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Nationalité
                                </label>

                                <input
                                    name="nationality"
                                    value={form.nationality}
                                    onChange={handleChange}
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Situation matrimoniale
                                </label>

                                <select
                                    name="marital_status"
                                    value={form.marital_status}
                                    onChange={handleChange}
                                >

                                    <option value="">
                                        Sélectionner
                                    </option>

                                    <option value="célibataire">
                                        Célibataire
                                    </option>

                                    <option value="marie">
                                        Marié(e)
                                    </option>

                                    <option value="divorce">
                                        Divorcé(e)
                                    </option>

                                    <option value="veuf">
                                        Veuf / Veuve
                                    </option>

                                </select>

                            </div>


                            <div className="form-group">

                                <label>
                                    Nombre d'enfants
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    name="children_count"
                                    value={form.children_count}
                                    onChange={handleChange}
                                />

                            </div>

                        </div>

                    </div>


                    {/* ================================
                        COORDONNÉES
                    ================================= */}

                    <div className="form-section">

                        <div className="form-section-title">

                            <div className="section-icon">
                                <FileText size={17} />
                            </div>

                            <div>

                                <h3>
                                    Coordonnées
                                </h3>

                                <p>
                                    Moyens de contact de l'employé
                                </p>

                            </div>

                        </div>


                        <div className="form-grid">


                            <div className="form-group">

                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="exemple@email.com"
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Téléphone
                                </label>

                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+241 ..."
                                />

                            </div>

                        </div>

                    </div>


                    {/* ================================
                        INFORMATIONS PROFESSIONNELLES
                    ================================= */}

                    <div className="form-section">

                        <div className="form-section-title">

                            <div className="section-icon">
                                <Briefcase size={17} />
                            </div>

                            <div>

                                <h3>
                                    Informations professionnelles
                                </h3>

                                <p>
                                    Poste, service et embauche
                                </p>

                            </div>

                        </div>


                        <div className="form-grid">


                            <div className="form-group">

                                <label>
                                    Matricule *
                                </label>

                                <input
                                    name="matricule"
                                    value={form.matricule}
                                    onChange={handleChange}
                                    placeholder="Ex. EMP-001"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Poste
                                </label>

                                <input
                                    name="position"
                                    value={form.position}
                                    onChange={handleChange}
                                    placeholder="Ex. Technicien"
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Service
                                </label>

                                <select
                                    name="service_id"
                                    value={form.service_id}
                                    onChange={handleChange}
                                    disabled={loadingServices}
                                >

                                    <option value="">
                                        {loadingServices
                                            ? "Chargement..."
                                            : "Aucun service"}
                                    </option>

                                    {services.map(
                                        (service) => (

                                            <option
                                                key={service.id}
                                                value={service.id}
                                            >
                                                {service.name}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            <div className="form-group">

                                <label>
                                    Date d'embauche
                                </label>

                                <input
                                    type="date"
                                    name="hire_date"
                                    value={form.hire_date}
                                    onChange={handleChange}
                                />

                            </div>

                        </div>

                    </div>


                    {/* ================================
                        INFORMATIONS ADMINISTRATIVES
                    ================================= */}

                    <div className="form-section">

                        <div className="form-section-title">

                            <div className="section-icon">
                                <FileText size={17} />
                            </div>

                            <div>

                                <h3>
                                    Informations administratives
                                </h3>

                                <p>
                                    Informations nécessaires à la gestion
                                </p>

                            </div>

                        </div>


                        <div className="form-grid">


                            <div className="form-group">

                                <label>
                                    Numéro CNSS
                                </label>

                                <input
                                    name="cnss_number"
                                    value={form.cnss_number}
                                    onChange={handleChange}
                                    placeholder="Numéro CNSS"
                                />

                            </div>

                        </div>

                    </div>


                    {/* FOOTER */}

                    <div className="employee-modal-footer">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Annuler
                        </button>


                        <button
                            type="submit"
                            className="primary-button"
                            disabled={loading}
                        >

                            <Save size={17} />

                            {loading
                                ? "Enregistrement..."
                                : isEdit
                                    ? "Enregistrer les modifications"
                                    : "Créer l'employé"}

                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};


export default EmployeeModal;