import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Power,
    Building2,
    UserRound,
    X,
} from "lucide-react";

import api from "../../api/api";
import "./Clients.css";

const emptyForm = {
    client_type: "entreprise",
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Gabon",
    nif: "",
    rccm: "",
    notes: "",
};

const Clients = () => {

    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        recent: 0,
    });

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showModal, setShowModal] = useState(false);

    const [editingClient, setEditingClient] = useState(null);

    const [form, setForm] = useState(emptyForm);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const [clientsData, statsData] = await Promise.all([
                api.get("/clients"),
                api.get("/clients/stats"),
            ]);

            setClients(clientsData);
            setStats(statsData);

        } catch (error) {

            console.error(
                "Erreur chargement clients :",
                error
            );

            alert(
                error.message ||
                "Impossible de charger les clients"
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        loadData();
    }, []);


    // =====================================================
    // RECHERCHE
    // =====================================================

    const filteredClients = clients.filter((client) => {

        const value = search.toLowerCase();

        return (
            client.name?.toLowerCase().includes(value) ||
            client.contact_name?.toLowerCase().includes(value) ||
            client.email?.toLowerCase().includes(value) ||
            client.phone?.toLowerCase().includes(value) ||
            client.city?.toLowerCase().includes(value) ||
            client.nif?.toLowerCase().includes(value) ||
            client.rccm?.toLowerCase().includes(value)
        );

    });


    // =====================================================
    // FORMULAIRE
    // =====================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

    };


    const openCreateModal = () => {

        setEditingClient(null);

        setForm(emptyForm);

        setShowModal(true);
    };


    const openEditModal = (client) => {

        setEditingClient(client);

        setForm({
            client_type: client.client_type || "entreprise",
            name: client.name || "",
            contact_name: client.contact_name || "",
            email: client.email || "",
            phone: client.phone || "",
            address: client.address || "",
            city: client.city || "",
            country: client.country || "Gabon",
            nif: client.nif || "",
            rccm: client.rccm || "",
            notes: client.notes || "",
        });

        setShowModal(true);
    };


    const closeModal = () => {

        if (saving) {
            return;
        }

        setShowModal(false);
        setEditingClient(null);
        setForm(emptyForm);
    };


    // =====================================================
    // CRÉATION / MODIFICATION
    // =====================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!form.name.trim()) {

            alert(
                "Le nom du client est obligatoire"
            );

            return;
        }

        try {

            setSaving(true);

            if (editingClient) {

                await api.put(
                    `/clients/${editingClient.id}`,
                    form
                );

            } else {

                await api.post(
                    "/clients",
                    form
                );

            }

            closeModal();

            await loadData();

        } catch (error) {

            console.error(
                "Erreur enregistrement client :",
                error
            );

            alert(
                error.message ||
                "Impossible d'enregistrer le client"
            );

        } finally {

            setSaving(false);

        }
    };


    // =====================================================
    // STATUT
    // =====================================================

    const handleToggleStatus = async (client) => {

        const action =
            client.status === "actif"
                ? "désactiver"
                : "activer";

        if (
            !window.confirm(
                `Voulez-vous ${action} ce client ?`
            )
        ) {
            return;
        }

        try {

            await api.patch(
                `/clients/${client.id}/status`
            );

            await loadData();

        } catch (error) {

            console.error(
                "Erreur statut client :",
                error
            );

            alert(
                error.message ||
                "Impossible de modifier le statut"
            );
        }
    };


    // =====================================================
    // SUPPRESSION
    // =====================================================

    const handleDelete = async (client) => {

        if (
            !window.confirm(
                `Voulez-vous vraiment supprimer "${client.name}" ?`
            )
        ) {
            return;
        }

        try {

            await api.delete(
                `/clients/${client.id}`
            );

            await loadData();

        } catch (error) {

            console.error(
                "Erreur suppression client :",
                error
            );

            alert(
                error.message ||
                "Impossible de supprimer le client"
            );
        }
    };


    // =====================================================
    // AFFICHAGE
    // =====================================================

    return (
        <div className="clients-page">

            {/* =================================================
                MINI DASHBOARD
            ================================================= */}

            <div className="clients-stats">

                <div className="client-stat-card">

                    <div className="client-stat-icon">
                        <Building2 size={20} />
                    </div>

                    <div>
                        <span>Total clients</span>
                        <strong>{stats.total || 0}</strong>
                    </div>

                </div>


                <div className="client-stat-card">

                    <div className="client-stat-icon">
                        <Power size={20} />
                    </div>

                    <div>
                        <span>Clients actifs</span>
                        <strong>{stats.active || 0}</strong>
                    </div>

                </div>


                <div className="client-stat-card">

                    <div className="client-stat-icon">
                        <UserRound size={20} />
                    </div>

                    <div>
                        <span>Clients inactifs</span>
                        <strong>{stats.inactive || 0}</strong>
                    </div>

                </div>


                <div className="client-stat-card">

                    <div className="client-stat-icon">
                        <Plus size={20} />
                    </div>

                    <div>
                        <span>Nouveaux</span>
                        <strong>{stats.recent || 0}</strong>
                    </div>

                </div>

            </div>


            {/* =================================================
                EN-TÊTE
            ================================================= */}

            <div className="clients-header">

                <div>
                    <h2>Clients</h2>

                    <p>
                        Gérez vos clients et leurs informations
                    </p>
                </div>


                <button
                    className="primary-button"
                    onClick={openCreateModal}
                >
                    <Plus size={18} />
                    Nouveau client
                </button>

            </div>


            {/* =================================================
                BARRE DE RECHERCHE
            ================================================= */}

            <div className="clients-toolbar">

                <div className="client-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Rechercher un client..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>

            </div>


            {/* =================================================
                TABLEAU
            ================================================= */}

            <div className="clients-table-container">

                {loading ? (

                    <div className="clients-empty">
                        Chargement des clients...
                    </div>

                ) : filteredClients.length === 0 ? (

                    <div className="clients-empty">

                        <Building2 size={42} />

                        <h3>
                            {search
                                ? "Aucun client trouvé"
                                : "Aucun client"}
                        </h3>

                        <p>
                            {search
                                ? "Essayez une autre recherche."
                                : "Commencez par ajouter votre premier client."}
                        </p>

                        {!search && (
                            <button
                                className="primary-button"
                                onClick={openCreateModal}
                            >
                                <Plus size={18} />
                                Ajouter un client
                            </button>
                        )}

                    </div>

                ) : (

                    <table className="clients-table">

                        <thead>

                            <tr>

                                <th>Client</th>

                                <th>Type</th>

                                <th>Contact</th>

                                <th>Téléphone</th>

                                <th>Ville</th>

                                <th>Statut</th>

                                <th>Actions</th>

                            </tr>

                        </thead>


                        <tbody>

                            {filteredClients.map((client) => (

                                <tr key={client.id}>

                                    <td>

                                        <div className="client-name">

                                            <div className="client-avatar">

                                                {client.client_type ===
                                                "particulier" ? (
                                                    <UserRound size={17} />
                                                ) : (
                                                    <Building2 size={17} />
                                                )}

                                            </div>

                                            <div>

                                                <strong>
                                                    {client.name}
                                                </strong>

                                                {client.email && (
                                                    <span>
                                                        {client.email}
                                                    </span>
                                                )}

                                            </div>

                                        </div>

                                    </td>


                                    <td>

                                        <span className="client-type">

                                            {client.client_type ===
                                            "particulier"
                                                ? "Particulier"
                                                : "Entreprise"}

                                        </span>

                                    </td>


                                    <td>
                                        {client.contact_name || "—"}
                                    </td>


                                    <td>
                                        {client.phone || "—"}
                                    </td>


                                    <td>
                                        {client.city || "—"}
                                    </td>


                                    <td>

                                        <span
                                            className={
                                                client.status === "actif"
                                                    ? "status-badge active"
                                                    : "status-badge inactive"
                                            }
                                        >
                                            {client.status === "actif"
                                                ? "Actif"
                                                : "Inactif"}
                                        </span>

                                    </td>


                                    <td>

                                        <div className="client-actions">

                                            <button
                                                title="Modifier"
                                                onClick={() =>
                                                    openEditModal(client)
                                                }
                                            >
                                                <Pencil size={16} />
                                            </button>


                                            <button
                                                title={
                                                    client.status ===
                                                    "actif"
                                                        ? "Désactiver"
                                                        : "Activer"
                                                }
                                                onClick={() =>
                                                    handleToggleStatus(
                                                        client
                                                    )
                                                }
                                            >
                                                <Power size={16} />
                                            </button>


                                            <button
                                                className="danger"
                                                title="Supprimer"
                                                onClick={() =>
                                                    handleDelete(client)
                                                }
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </div>


            {/* =================================================
                MODAL
            ================================================= */}

            {showModal && (

                <div
                    className="client-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target === e.currentTarget
                        ) {
                            closeModal();
                        }

                    }}
                >

                    <div className="client-modal">

                        <div className="client-modal-header">

                            <div>

                                <h2>
                                    {editingClient
                                        ? "Modifier le client"
                                        : "Nouveau client"}
                                </h2>

                                <p>
                                    Informations du client
                                </p>

                            </div>


                            <button
                                className="modal-close"
                                onClick={closeModal}
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            className="client-form"
                        >

                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        Type de client
                                    </label>

                                    <select
                                        name="client_type"
                                        value={form.client_type}
                                        onChange={handleChange}
                                    >

                                        <option value="entreprise">
                                            Entreprise
                                        </option>

                                        <option value="particulier">
                                            Particulier
                                        </option>

                                    </select>

                                </div>


                                <div className="form-group">

                                    <label>
                                        Nom / raison sociale *
                                    </label>

                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Ex : EGENEM"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Personne à contacter
                                    </label>

                                    <input
                                        name="contact_name"
                                        value={form.contact_name}
                                        onChange={handleChange}
                                        placeholder="Nom du contact"
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


                                <div className="form-group">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="client@email.com"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Ville
                                    </label>

                                    <input
                                        name="city"
                                        value={form.city}
                                        onChange={handleChange}
                                        placeholder="Port-Gentil"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Pays
                                    </label>

                                    <input
                                        name="country"
                                        value={form.country}
                                        onChange={handleChange}
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        NIF
                                    </label>

                                    <input
                                        name="nif"
                                        value={form.nif}
                                        onChange={handleChange}
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        RCCM
                                    </label>

                                    <input
                                        name="rccm"
                                        value={form.rccm}
                                        onChange={handleChange}
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        Adresse
                                    </label>

                                    <input
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Adresse du client"
                                    />

                                </div>


                                <div className="form-group full">

                                    <label>
                                        Notes
                                    </label>

                                    <textarea
                                        name="notes"
                                        value={form.notes}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Informations complémentaires..."
                                    />

                                </div>

                            </div>


                            <div className="client-form-actions">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Enregistrement..."
                                        : editingClient
                                            ? "Enregistrer"
                                            : "Créer le client"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
};

export default Clients;