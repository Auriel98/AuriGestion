import React, { useEffect, useRef, useState } from "react";

import {
    X,
    User,
    Briefcase,
    FileText,
    Save,
    Camera,
    Trash2,
} from "lucide-react";

import api from "../../api/api";

import "./EmployeeModal.css";


// URL du serveur backend (là où sont servis les /uploads).
// ADAPTE selon ton projet :
//   Vite : import.meta.env.VITE_API_URL
//   CRA  : process.env.REACT_APP_API_URL
const SERVER_URL = "http://localhost:5000";

const buildPhotoSrc = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http") || photoUrl.startsWith("blob:")) {
        return photoUrl;
    }
    return `${SERVER_URL}${photoUrl}`;
};

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo


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

    const [form, setForm] = useState(initialForm);
    const [services, setServices] = useState([]);

    const [loading, setLoading] = useState(false);
    const [loadingServices, setLoadingServices] = useState(false);
    const [error, setError] = useState("");

    // ----- Photo -----
    const fileInputRef = useRef(null);

    const [photoFile, setPhotoFile] = useState(null);       // nouveau fichier choisi
    const [photoPreview, setPhotoPreview] = useState(null); // aperçu local (blob)
    const [existingPhoto, setExistingPhoto] = useState(null); // photo déjà en base
    const [removeExisting, setRemoveExisting] = useState(false);

    const isEdit = Boolean(employee);


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
                matricule: employee.matricule || "",
                first_name: employee.first_name || "",
                last_name: employee.last_name || "",

                email: employee.email || "",
                phone: employee.phone || "",

                birth_date: employee.birth_date
                    ? employee.birth_date.substring(0, 10)
                    : "",

                birth_place: employee.birth_place || "",

                nationality: employee.nationality || "Gabonaise",
                marital_status: employee.marital_status || "",
                children_count: employee.children_count ?? 0,

                cnss_number: employee.cnss_number || "",

                position: employee.position || "",

                hire_date: employee.hire_date
                    ? employee.hire_date.substring(0, 10)
                    : "",

                service_id: employee.service_id || "",
            });

            setExistingPhoto(employee.photo_url || null);

        } else {

            setForm(initialForm);
            setExistingPhoto(null);
        }

        // Réinitialiser l'état de la photo à chaque ouverture
        setPhotoFile(null);
        setPhotoPreview(null);
        setRemoveExisting(false);
        setError("");

    }, [isOpen, employee]);


    // Libérer l'URL blob quand l'aperçu change ou à la fermeture
    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);


    // =====================================================
    // SERVICES
    // =====================================================

    const loadServices = async () => {

        try {

            setLoadingServices(true);

            const response = await api.get("/services");

            setServices(Array.isArray(response) ? response : []);

        } catch (error) {

            console.error("Erreur chargement services :", error);

        } finally {

            setLoadingServices(false);
        }
    };


    // =====================================================
    // CHANGEMENT FORMULAIRE
    // =====================================================

    const handleChange = (event) => {

        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };


    // =====================================================
    // PHOTO
    // =====================================================

    const handlePhotoChange = (event) => {

        const file = event.target.files?.[0];

        // Permet de re-sélectionner le même fichier ensuite
        event.target.value = "";

        if (!file) {
            return;
        }

        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            setError("Format accepté : JPG, PNG ou WEBP.");
            return;
        }

        if (file.size > MAX_PHOTO_SIZE) {
            setError("La photo ne doit pas dépasser 5 Mo.");
            return;
        }

        setError("");
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setRemoveExisting(false);
    };


    const handleRemovePhoto = () => {

        // Annule la nouvelle sélection
        setPhotoFile(null);
        setPhotoPreview(null);

        // Si une photo existe en base, on la marque pour suppression
        if (existingPhoto) {
            setRemoveExisting(true);
        }
    };


    // Photo affichée : aperçu > photo existante (sauf si supprimée)
    const displayedPhoto =
        photoPreview ||
        (!removeExisting ? buildPhotoSrc(existingPhoto) : null);

    const initials =
        `${form.first_name?.[0] || ""}${form.last_name?.[0] || ""}`
            .toUpperCase();


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

            // multipart/form-data : champs + photo
            const formData = new FormData();

            Object.entries(form).forEach(([key, value]) => {
                formData.append(
                    key,
                    value === null || value === undefined ? "" : value
                );
            });

            if (photoFile) {
                // Le nom "photo" doit correspondre à upload.single("photo")
                formData.append("photo", photoFile);
            }

            if (isEdit) {

                await api.put(`/employees/${employee.id}`, formData);

                // Suppression de la photo existante sans remplacement
                if (removeExisting && !photoFile && existingPhoto) {
                    await api.delete(`/employees/${employee.id}/photo`);
                }

            } else {

                await api.post("/employees", formData);
            }

            onSuccess();

        } catch (error) {

            console.error("Erreur sauvegarde employé :", error);

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

                if (event.target === event.currentTarget) {
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
                        PHOTO
                    ================================= */}

                    <div className="photo-upload">

                        <div className="photo-avatar">

                            {displayedPhoto ? (

                                <img
                                    src={displayedPhoto}
                                    alt="Photo de l'employé"
                                />

                            ) : (

                                <span>
                                    {initials || <User size={30} />}
                                </span>

                            )}

                        </div>

                        <div className="photo-actions">

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePhotoChange}
                                hidden
                            />

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                            >
                                <Camera size={16} />
                                {displayedPhoto
                                    ? "Changer la photo"
                                    : "Ajouter une photo"}
                            </button>

                            {displayedPhoto && (

                                <button
                                    type="button"
                                    className="photo-remove"
                                    onClick={handleRemovePhoto}
                                    disabled={loading}
                                >
                                    <Trash2 size={16} />
                                    Retirer
                                </button>

                            )}

                            <small>
                                JPG, PNG ou WEBP — 5 Mo maximum
                            </small>

                        </div>

                    </div>


                    {/* ================================
                        INFORMATIONS PERSONNELLES
                    ================================= */}

                    <div className="form-section">

                        <div className="form-section-title">

                            <div className="section-icon">
                                <User size={17} />
                            </div>

                            <div>
                                <h3>Informations personnelles</h3>
                                <p>Identité et informations personnelles</p>
                            </div>

                        </div>

                        <div className="form-grid">

                            <div className="form-group">
                                <label>Prénom *</label>
                                <input
                                    name="first_name"
                                    value={form.first_name}
                                    onChange={handleChange}
                                    placeholder="Ex. Ghislain"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Nom *</label>
                                <input
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    placeholder="Ex. Ondeno"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Date de naissance</label>
                                <input
                                    type="date"
                                    name="birth_date"
                                    value={form.birth_date}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Lieu de naissance</label>
                                <input
                                    name="birth_place"
                                    value={form.birth_place}
                                    onChange={handleChange}
                                    placeholder="Ex. Libreville"
                                />
                            </div>

                            <div className="form-group">
                                <label>Nationalité</label>
                                <input
                                    name="nationality"
                                    value={form.nationality}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Situation matrimoniale</label>
                                <select
                                    name="marital_status"
                                    value={form.marital_status}
                                    onChange={handleChange}
                                >
                                    <option value="">Sélectionner</option>
                                    <option value="célibataire">Célibataire</option>
                                    <option value="marie">Marié(e)</option>
                                    <option value="divorce">Divorcé(e)</option>
                                    <option value="veuf">Veuf / Veuve</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nombre d'enfants</label>
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
                                <h3>Coordonnées</h3>
                                <p>Moyens de contact de l'employé</p>
                            </div>

                        </div>

                        <div className="form-grid">

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="exemple@email.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Téléphone</label>
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
                                <h3>Informations professionnelles</h3>
                                <p>Poste, service et embauche</p>
                            </div>

                        </div>

                        <div className="form-grid">

                            <div className="form-group">
                                <label>Matricule *</label>
                                <input
                                    name="matricule"
                                    value={form.matricule}
                                    onChange={handleChange}
                                    placeholder="Ex. EMP-001"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Poste</label>
                                <input
                                    name="position"
                                    value={form.position}
                                    onChange={handleChange}
                                    placeholder="Ex. Technicien"
                                />
                            </div>

                            <div className="form-group">
                                <label>Service</label>
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

                                    {services.map((service) => (
                                        <option
                                            key={service.id}
                                            value={service.id}
                                        >
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Date d'embauche</label>
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
                                <h3>Informations administratives</h3>
                                <p>Informations nécessaires à la gestion</p>
                            </div>

                        </div>

                        <div className="form-grid">

                            <div className="form-group">
                                <label>Numéro CNSS</label>
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