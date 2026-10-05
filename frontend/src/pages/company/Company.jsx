import { useEffect, useRef, useState } from "react";

import {
    Building2,
    Pencil,
    Save,
    X,
    Upload,
    Trash2,
} from "lucide-react";

import api, { API_ORIGIN } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

import "./Company.css";


// Doit correspondre à ADMIN_ROLES du backend (comparaison sans casse)
const ADMIN_ROLES = ["admin", "super_admin", "rh", "directeur"];

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FIELDS = [
    { name: "name", label: "Nom de l'entreprise", required: true },
    { name: "legal_name", label: "Raison sociale" },
    { name: "nif", label: "NIF" },
    { name: "rccm", label: "RCCM" },
    { name: "cnss", label: "N° CNSS employeur" },
    { name: "phone", label: "Téléphone" },
    { name: "email", label: "Email", type: "email" },
    { name: "address", label: "Adresse", textarea: true, full: true },
];


const toForm = (company) =>
    FIELDS.reduce((acc, field) => {
        acc[field.name] = company?.[field.name] || "";
        return acc;
    }, {});


const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.message || fallback;


const Company = () => {

    const { user, refreshUser } = useAuth();

    const canEdit = ADMIN_ROLES.includes(
        String(user?.role || "").toLowerCase()
    );

    const fileInput = useRef(null);

    const [company, setCompany] = useState(null);
    const [form, setForm] = useState(toForm(null));
    const [editing, setEditing] = useState(false);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [feedback, setFeedback] = useState(null); // { type, text }


    const showFeedback = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 4000);
    };


    const load = async () => {
        try {
            setLoadError(null);

            const data = await api("/company");

            setCompany(data);
            setForm(toForm(data));
        } catch (error) {
            console.error("Erreur chargement entreprise :", error);

            setLoadError(
                getErrorMessage(error, "Impossible de charger l'entreprise")
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);


    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };


    const handleCancel = () => {
        setForm(toForm(company));
        setEditing(false);
    };


    const handleSave = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            showFeedback("error", "Le nom de l'entreprise est obligatoire");
            return;
        }

        try {
            setSaving(true);

            const data = await api("/company", {
                method: "PUT",
                body: JSON.stringify(form),
            });

            setCompany((prev) => ({ ...prev, ...data.company }));
            setForm(toForm(data.company));
            setEditing(false);

            await refreshUser();

            showFeedback("success", data.message);
        } catch (error) {
            showFeedback(
                "error",
                getErrorMessage(error, "Erreur lors de l'enregistrement")
            );
        } finally {
            setSaving(false);
        }
    };


    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];

        e.target.value = ""; // permet de re-choisir le même fichier

        if (!file) return;

        if (!LOGO_TYPES.includes(file.type)) {
            showFeedback("error", "Format accepté : JPG, PNG ou WEBP");
            return;
        }

        if (file.size > MAX_LOGO_SIZE) {
            showFeedback("error", "Le logo ne doit pas dépasser 2 Mo");
            return;
        }

        const formData = new FormData();
        formData.append("logo", file);

        try {
            setUploading(true);

            // Même principe que l'upload de la photo de profil :
            // pas de Content-Type manuel avec FormData
            const data = await api("/company/logo", {
                method: "PUT",
                body: formData,
            });

            setCompany((prev) => ({ ...prev, logo_url: data.logo_url }));

            await refreshUser();

            showFeedback("success", data.message);
        } catch (error) {
            showFeedback(
                "error",
                getErrorMessage(error, "Erreur lors de l'envoi du logo")
            );
        } finally {
            setUploading(false);
        }
    };


    const handleLogoDelete = async () => {
        if (!window.confirm("Supprimer le logo de l'entreprise ?")) return;

        try {
            setUploading(true);

            const data = await api("/company/logo", {
                method: "DELETE",
            });

            setCompany((prev) => ({ ...prev, logo_url: null }));

            await refreshUser();

            showFeedback("success", data.message);
        } catch (error) {
            showFeedback(
                "error",
                getErrorMessage(error, "Erreur lors de la suppression du logo")
            );
        } finally {
            setUploading(false);
        }
    };


    if (loading) {
        return <p className="company-loading">Chargement...</p>;
    }

    if (!company) {
        return (
            <div className="company-card">
                <div className="company-feedback error">
                    {loadError || "Entreprise introuvable"}
                </div>

                <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop: 16 }}
                    onClick={() => {
                        setLoading(true);
                        load();
                    }}
                >
                    Réessayer
                </button>
            </div>
        );
    }

    const logoSrc = company.logo_url
        ? `${API_ORIGIN}${company.logo_url}`
        : null;


    return (
        <div className="company-page">

            {feedback && (
                <div className={`company-feedback ${feedback.type}`}>
                    {feedback.text}
                </div>
            )}

            {/* ============ LOGO + EN-TÊTE ============ */}
            <div className="company-card company-header">

                <div className="company-logo">
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo de l'entreprise" />
                    ) : (
                        <Building2 size={40} />
                    )}
                </div>

                <div className="company-header-info">
                    <h2>{company.name}</h2>
                    <p>{company.legal_name || "Raison sociale non renseignée"}</p>

                    {canEdit && (
                        <div className="company-logo-actions">

                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleLogoChange}
                                hidden
                            />

                            <button
                                type="button"
                                className="btn-secondary"
                                disabled={uploading}
                                onClick={() => fileInput.current.click()}
                            >
                                <Upload size={16} />
                                {uploading
                                    ? "Envoi..."
                                    : logoSrc
                                    ? "Changer le logo"
                                    : "Ajouter un logo"}
                            </button>

                            {logoSrc && (
                                <button
                                    type="button"
                                    className="btn-danger"
                                    disabled={uploading}
                                    onClick={handleLogoDelete}
                                >
                                    <Trash2 size={16} />
                                    Supprimer
                                </button>
                            )}

                        </div>
                    )}

                    <small>JPG, PNG ou WEBP - 2 Mo maximum</small>
                </div>

            </div>

            {/* ============ INFORMATIONS ============ */}
            <form className="company-card" onSubmit={handleSave}>

                <div className="company-card-title">
                    <h3>Informations de l'entreprise</h3>

                    {canEdit && !editing && (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil size={16} />
                            Modifier
                        </button>
                    )}
                </div>

                <div className="company-grid">
                    {FIELDS.map((field) => (
                        <div
                            key={field.name}
                            className={`company-field ${field.full ? "full" : ""}`}
                        >
                            <label htmlFor={field.name}>
                                {field.label}
                                {editing && field.required && " *"}
                            </label>

                            {editing ? (
                                field.textarea ? (
                                    <textarea
                                        id={field.name}
                                        name={field.name}
                                        rows={3}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <input
                                        id={field.name}
                                        name={field.name}
                                        type={field.type || "text"}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                    />
                                )
                            ) : (
                                <p>{company[field.name] || "-"}</p>
                            )}
                        </div>
                    ))}
                </div>

                {editing && (
                    <div className="company-form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            <X size={16} />
                            Annuler
                        </button>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={saving}
                        >
                            <Save size={16} />
                            {saving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </div>
                )}

            </form>

        </div>
    );
};

export default Company;