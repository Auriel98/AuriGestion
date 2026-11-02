import React, { useEffect, useState } from "react";

import {
    X,
    User,
    Briefcase,
    Phone,
    FileText,
    Download,
    Pencil,
} from "lucide-react";

import api, { API_ORIGIN } from "../../api/api";

import "./EmployeeModal.css";
import "./EmployeeDetailModal.css";


const buildPhotoSrc = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http") || photoUrl.startsWith("blob:")) {
        return photoUrl;
    }
    return `${API_ORIGIN}${photoUrl}`;
};

const MARITAL_LABELS = {
    "célibataire": "Célibataire",
    marie: "Marié(e)",
    divorce: "Divorcé(e)",
    veuf: "Veuf / Veuve",
};

const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("fr-FR") : "—";

const escapeHtml = (value) =>
    String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");


const EmployeeDetailModal = ({
    isOpen,
    employee,      // employé de la liste (affichage immédiat)
    onClose,
    onEdit,
}) => {

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {

        if (!isOpen || !employee) {
            return;
        }

        let cancelled = false;

        const load = async () => {

            try {

                setLoading(true);
                setError("");
                setDetails(null);

                const response = await api.get(`/employees/${employee.id}`);

                if (!cancelled) {
                    setDetails(response?.employee ?? response);
                }

            } catch (err) {

                if (!cancelled) {
                    console.error("Erreur chargement fiche employé :", err);
                    setError(err.message || "Impossible de charger la fiche.");
                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };

    }, [isOpen, employee]);


    if (!isOpen || !employee) {
        return null;
    }

    // Données complètes si chargées, sinon celles de la liste
    const data = details || employee;

    const photo = buildPhotoSrc(data.photo_url);

    const initials =
        `${data.first_name?.[0] || ""}${data.last_name?.[0] || ""}`
            .toUpperCase();

    const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();

    const sections = [
        {
            title: "Informations personnelles",
            icon: User,
            rows: [
                ["Prénom", data.first_name],
                ["Nom", data.last_name],
                ["Date de naissance", formatDate(data.birth_date)],
                ["Lieu de naissance", data.birth_place],
                ["Nationalité", data.nationality],
                [
                    "Situation matrimoniale",
                    MARITAL_LABELS[data.marital_status] || data.marital_status,
                ],
                ["Nombre d'enfants", data.children_count ?? 0],
            ],
        },
        {
            title: "Coordonnées",
            icon: Phone,
            rows: [
                ["Email", data.email],
                ["Téléphone", data.phone],
            ],
        },
        {
            title: "Informations professionnelles",
            icon: Briefcase,
            rows: [
                ["Matricule", data.matricule],
                ["Poste", data.position],
                ["Service", data.service_name],
                ["Date d'embauche", formatDate(data.hire_date)],
                ["Statut", data.status === "actif" ? "Actif" : "Inactif"],
            ],
        },
        {
            title: "Informations administratives",
            icon: FileText,
            rows: [
                ["Numéro CNSS", data.cnss_number],
                ["Compte utilisateur", data.has_user ? "Compte créé" : "Aucun compte"],
            ],
        },
    ];


    // =====================================================
    // TÉLÉCHARGEMENT (impression → Enregistrer en PDF)
    // =====================================================

    const handleDownload = () => {

        const sectionsHtml = sections
            .map(
                (section) => `
                <h2>${escapeHtml(section.title)}</h2>
                <table>
                    ${section.rows
                        .map(
                            ([label, value]) => `
                        <tr>
                            <th>${escapeHtml(label)}</th>
                            <td>${escapeHtml(value || "—")}</td>
                        </tr>`
                        )
                        .join("")}
                </table>`
            )
            .join("");

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Fiche employé - ${escapeHtml(fullName)}</title>
<style>
    body { font-family: Arial, sans-serif; color: #1f2937; padding: 32px; }
    .head { display: flex; align-items: center; gap: 20px;
            border-bottom: 2px solid #1f2937; padding-bottom: 16px; }
    .head img, .avatar { width: 90px; height: 90px; border-radius: 50%;
            object-fit: cover; background: #e5e7eb; display: flex;
            align-items: center; justify-content: center;
            font-size: 28px; font-weight: bold; }
    .head h1 { margin: 0; font-size: 22px; }
    .head p { margin: 4px 0 0; color: #6b7280; }
    h2 { font-size: 15px; margin: 24px 0 8px; color: #374151;
         text-transform: uppercase; letter-spacing: .04em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 7px 10px;
             border: 1px solid #e5e7eb; font-size: 13px; }
    th { width: 35%; background: #f9fafb; font-weight: 600; }
    .foot { margin-top: 32px; font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
    <div class="head">
        ${
            photo
                ? `<img src="${escapeHtml(photo)}" alt="" />`
                : `<div class="avatar">${escapeHtml(initials)}</div>`
        }
        <div>
            <h1>${escapeHtml(fullName)}</h1>
            <p>${escapeHtml(data.position || "—")} — ${escapeHtml(data.matricule)}</p>
        </div>
    </div>
    ${sectionsHtml}
    <div class="foot">Fiche éditée le ${new Date().toLocaleDateString("fr-FR")}</div>
    <script>
        window.onload = function () {
            setTimeout(function () { window.print(); }, 300);
        };
    </script>
</body>
</html>`;

        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            setError("Le navigateur a bloqué la fenêtre. Autorisez les pop-ups.");
            return;
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };


    return (

        <div
            className="modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >

            <div className="employee-modal employee-detail">

                <div className="employee-modal-header">

                    <div>
                        <h2>Fiche employé</h2>
                        <p>Toutes les informations de l'employé.</p>
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="detail-body">

                    <div className="detail-hero">

                        <div className="photo-avatar">
                            {photo ? (
                                <img src={photo} alt={fullName} />
                            ) : (
                                <span>{initials || <User size={30} />}</span>
                            )}
                        </div>

                        <div>
                            <h3>{fullName}</h3>
                            <p>
                                {data.position || "Poste non renseigné"}
                                {data.service_name ? ` · ${data.service_name}` : ""}
                            </p>
                            <span
                                className={
                                    data.status === "actif"
                                        ? "status-badge active"
                                        : "status-badge inactive"
                                }
                            >
                                {data.status === "actif" ? "Actif" : "Inactif"}
                            </span>
                        </div>

                    </div>

                    {loading && (
                        <div className="detail-loading">Chargement...</div>
                    )}

                    {sections.map((section) => {

                        const Icon = section.icon;

                        return (
                            <div className="form-section" key={section.title}>

                                <div className="form-section-title">
                                    <div className="section-icon">
                                        <Icon size={17} />
                                    </div>
                                    <div>
                                        <h3>{section.title}</h3>
                                    </div>
                                </div>

                                <dl className="detail-grid">
                                    {section.rows.map(([label, value]) => (
                                        <div className="detail-item" key={label}>
                                            <dt>{label}</dt>
                                            <dd>{value || value === 0 ? value : "—"}</dd>
                                        </div>
                                    ))}
                                </dl>

                            </div>
                        );
                    })}

                </div>

                <div className="employee-modal-footer">

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onEdit(employee)}
                    >
                        <Pencil size={16} />
                        Modifier
                    </button>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={handleDownload}
                        disabled={loading}
                    >
                        <Download size={17} />
                        Télécharger la fiche
                    </button>

                </div>

            </div>

        </div>
    );
};

export default EmployeeDetailModal;