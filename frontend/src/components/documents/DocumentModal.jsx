import React, { useEffect, useState } from "react";
import {
    X,
    Upload,
    FileText,
    Trash2,
    ExternalLink,
    Calendar,
    File
} from "lucide-react";

import api from "../../api/api";
import "./DocumentModal.css";


const DocumentModal = ({
    employee,
    isOpen,
    onClose
}) => {

    const [documents, setDocuments] = useState([]);
    const [contracts, setContracts] = useState([]);

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [form, setForm] = useState({
        document_type: "CNI",
        title: "",
        contract_id: "",
        expiry_date: "",
        notes: ""
    });


    /* =====================================================
       CHARGER LES DOCUMENTS
    ===================================================== */

    const loadDocuments = async () => {

        if (!employee?.id) return;

        try {

            setLoading(true);

            const data = await api.get(
                `/documents/employee/${employee.id}`
            );

            setDocuments(data);

        } catch (error) {

            console.error(
                "Erreur chargement documents :",
                error
            );

        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
       CHARGER LES CONTRATS
    ===================================================== */

    const loadContracts = async () => {

        if (!employee?.id) return;

        try {

            const data = await api.get(
                `/contracts`
            );

            const employeeContracts =
                data.filter(
                    (contract) =>
                        contract.employee_id ===
                        employee.id
                );

            setContracts(
                employeeContracts
            );

        } catch (error) {

            console.error(
                "Erreur chargement contrats :",
                error
            );

        }

    };


    useEffect(() => {

        if (isOpen && employee?.id) {

            loadDocuments();
            loadContracts();

        }

    }, [
        isOpen,
        employee?.id
    ]);


    /* =====================================================
       FORMULAIRE
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

    };


    /* =====================================================
       FICHIER
    ===================================================== */

    const handleFileChange = (e) => {

        const file =
            e.target.files?.[0];

        if (!file) return;

        if (
            file.size >
            10 * 1024 * 1024
        ) {

            alert(
                "Le fichier ne doit pas dépasser 10 Mo."
            );

            return;

        }

        setSelectedFile(file);

        if (!form.title) {

            setForm((previous) => ({
                ...previous,
                title:
                    file.name
                        .replace(/\.[^/.]+$/, "")
            }));

        }

    };


    /* =====================================================
       UPLOAD
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!selectedFile) {

            alert(
                "Veuillez sélectionner un document."
            );

            return;

        }

        if (!form.title.trim()) {

            alert(
                "Veuillez renseigner le titre du document."
            );

            return;

        }


        try {

            setUploading(true);

            const formData =
                new FormData();

            formData.append(
                "employee_id",
                employee.id
            );

            formData.append(
                "document_type",
                form.document_type
            );

            formData.append(
                "title",
                form.title
            );

            formData.append(
                "document",
                selectedFile
            );


            if (form.contract_id) {

                formData.append(
                    "contract_id",
                    form.contract_id
                );

            }

            if (form.expiry_date) {

                formData.append(
                    "expiry_date",
                    form.expiry_date
                );

            }

            if (form.notes) {

                formData.append(
                    "notes",
                    form.notes
                );

            }


            await api.post(
                "/documents",
                formData
            );


            setForm({
                document_type: "CNI",
                title: "",
                contract_id: "",
                expiry_date: "",
                notes: ""
            });

            setSelectedFile(null);

            await loadDocuments();


        } catch (error) {

            console.error(
                "Erreur upload document :",
                error
            );

            alert(
                error.message ||
                "Impossible d'ajouter le document."
            );

        } finally {

            setUploading(false);

        }

    };


    /* =====================================================
       SUPPRESSION
    ===================================================== */

    const handleDelete = async (documentId) => {

        const confirmed =
            window.confirm(
                "Voulez-vous vraiment supprimer ce document ?"
            );

        if (!confirmed) return;

        try {

            await api.delete(
                `/documents/${documentId}`
            );

            await loadDocuments();

        } catch (error) {

            console.error(
                "Erreur suppression document :",
                error
            );

            alert(
                error.message ||
                "Impossible de supprimer le document."
            );

        }

    };


    if (!isOpen || !employee) {
        return null;
    }


    return (

        <div className="document-modal-overlay">

            <div className="document-modal">


                {/* =================================================
                   HEADER
                ================================================= */}

                <div className="document-modal-header">

                    <div>

                        <div className="document-modal-title">

                            <FileText size={21} />

                            <div>

                                <h2>
                                    Documents
                                </h2>

                                <p>
                                    {employee.first_name}{" "}
                                    {employee.last_name}
                                </p>

                            </div>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="document-close-btn"
                        onClick={onClose}
                    >

                        <X size={20} />

                    </button>

                </div>


                {/* =================================================
                   CONTENU
                ================================================= */}

                <div className="document-modal-content">


                    {/* =================================================
                       FORMULAIRE
                    ================================================= */}

                    <form
                        className="document-upload-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="document-section-title">

                            <Upload size={18} />

                            <span>
                                Ajouter un document
                            </span>

                        </div>


                        <div className="document-form-grid">


                            <div className="document-field">

                                <label>
                                    Type de document
                                </label>

                                <select
                                    name="document_type"
                                    value={
                                        form.document_type
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >

                                    <option value="CNI">
                                        CNI
                                    </option>

                                    <option value="CV">
                                        CV
                                    </option>

                                    <option value="Diplôme">
                                        Diplôme
                                    </option>

                                    <option value="CNSS">
                                        CNSS
                                    </option>

                                    <option value="Contrat">
                                        Contrat
                                    </option>

                                    <option value="Avenant">
                                        Avenant
                                    </option>

                                    <option value="Certificat">
                                        Certificat
                                    </option>

                                    <option value="Autre">
                                        Autre
                                    </option>

                                </select>

                            </div>


                            <div className="document-field">

                                <label>
                                    Titre
                                </label>

                                <input
                                    type="text"
                                    name="title"
                                    value={
                                        form.title
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Ex : CNI de l'employé"
                                />

                            </div>


                            <div className="document-field">

                                <label>
                                    Contrat
                                </label>

                                <select
                                    name="contract_id"
                                    value={
                                        form.contract_id
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >

                                    <option value="">
                                        Document personnel
                                    </option>

                                    {contracts.map(
                                        (contract) => (

                                            <option
                                                key={
                                                    contract.id
                                                }
                                                value={
                                                    contract.id
                                                }
                                            >

                                                {contract.contract_type}

                                                {contract.contract_number
                                                    ? ` - ${contract.contract_number}`
                                                    : ""}

                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            <div className="document-field">

                                <label>
                                    Date d'expiration
                                </label>

                                <input
                                    type="date"
                                    name="expiry_date"
                                    value={
                                        form.expiry_date
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                            </div>


                        </div>


                        <div className="document-field">

                            <label>
                                Fichier
                            </label>

                            <label className="document-file-input">

                                <File size={18} />

                                <span>
                                    {selectedFile
                                        ? selectedFile.name
                                        : "Choisir un fichier"}
                                </span>

                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                                    onChange={
                                        handleFileChange
                                    }
                                />

                            </label>

                            <small>
                                PDF, Word, Excel, JPG, PNG ou WEBP — 10 Mo maximum
                            </small>

                        </div>


                        <div className="document-field">

                            <label>
                                Notes
                            </label>

                            <textarea
                                name="notes"
                                value={
                                    form.notes
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Informations complémentaires..."
                                rows="2"
                            />

                        </div>


                        <button
                            type="submit"
                            className="document-upload-btn"
                            disabled={uploading}
                        >

                            <Upload size={17} />

                            {uploading
                                ? "Envoi..."
                                : "Ajouter le document"}

                        </button>

                    </form>


                    {/* =================================================
                       LISTE
                    ================================================= */}

                    <div className="document-list-section">

                        <div className="document-section-title">

                            <FileText size={18} />

                            <span>
                                Documents de l'employé
                            </span>

                            <span className="document-count">
                                {documents.length}
                            </span>

                        </div>


                        {loading ? (

                            <div className="document-empty">
                                Chargement...
                            </div>

                        ) : documents.length === 0 ? (

                            <div className="document-empty">

                                <FileText size={30} />

                                <p>
                                    Aucun document enregistré.
                                </p>

                            </div>

                        ) : (

                            <div className="document-list">

                                {documents.map(
                                    (document) => (

                                        <div
                                            className="document-item"
                                            key={
                                                document.id
                                            }
                                        >

                                            <div className="document-item-icon">

                                                <FileText size={20} />

                                            </div>


                                            <div className="document-item-info">

                                                <strong>
                                                    {document.title}
                                                </strong>

                                                <span>
                                                    {document.document_type}
                                                </span>

                                                {document.contract_id && (

                                                    <small>
                                                        Contrat :{" "}
                                                        {document.contract_type}

                                                        {document.contract_number
                                                            ? ` - ${document.contract_number}`
                                                            : ""}
                                                    </small>

                                                )}

                                                {document.expiry_date && (

                                                    <small>

                                                        <Calendar
                                                            size={13}
                                                        />

                                                        Expire le{" "}
                                                        {new Date(
                                                            document.expiry_date
                                                        ).toLocaleDateString(
                                                            "fr-FR"
                                                        )}

                                                    </small>

                                                )}

                                            </div>


                                            <div className="document-item-actions">

                                                <a
                                                    href={
                                                        `${import.meta.env.VITE_API_ORIGIN}${document.file_url}`
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="document-action-btn"
                                                    title="Ouvrir"
                                                >

                                                    <ExternalLink
                                                        size={17}
                                                    />

                                                </a>


                                                <button
                                                    type="button"
                                                    className="document-action-btn delete"
                                                    title="Supprimer"
                                                    onClick={() =>
                                                        handleDelete(
                                                            document.id
                                                        )
                                                    }
                                                >

                                                    <Trash2
                                                        size={17}
                                                    />

                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </div>

                </div>

            </div>

        </div>

    );

};


export default DocumentModal;