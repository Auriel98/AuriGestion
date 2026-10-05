import React, { useEffect, useState } from "react";

import {
    Users,
    UserCheck,
    UserX,
    UserPlus,
    Search,
    Plus,
    MoreVertical,
    Pencil,
    Power,
    Trash2,
    FolderOpen,
} from "lucide-react";

import api from "../../api/api";

import MiniDashboard from "../../components/dashboard/MiniDashboard";
import EmployeeModal from "../../components/employees/EmployeeModal";
import DocumentModal from "../../components/documents/DocumentModal";

import "./Employees.css";


const Employees = () => {

    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState(null);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [openActionId, setOpenActionId] = useState(null);

    // Modal ajout / modification
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Modal documents (state séparé pour ne pas entrer en conflit
    // avec selectedEmployee utilisé par le modal d'édition)
    const [documentModalOpen, setDocumentModalOpen] = useState(false);
    const [documentEmployee, setDocumentEmployee] = useState(null);

    const [actionLoading, setActionLoading] = useState(false);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const [
                statsResponse,
                employeesResponse,
            ] = await Promise.all([
                api.get("/employees/stats"),
                api.get("/employees"),
            ]);

            setStats(statsResponse);
            setEmployees(employeesResponse);

        } catch (error) {

            console.error("Erreur chargement employés :", error);

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {

        loadData();

    }, []);


    // =====================================================
    // FILTRAGE
    // =====================================================

    const filteredEmployees = employees.filter((employee) => {

        const fullName =
            `${employee.first_name} ${employee.last_name}`.toLowerCase();

        const searchValue = search.toLowerCase().trim();

        const matchesSearch =
            !searchValue ||
            fullName.includes(searchValue) ||
            employee.matricule?.toLowerCase().includes(searchValue) ||
            employee.email?.toLowerCase().includes(searchValue) ||
            employee.position?.toLowerCase().includes(searchValue);

        const matchesStatus =
            statusFilter === "all" ||
            employee.status === statusFilter;

        return matchesSearch && matchesStatus;
    });


    // =====================================================
    // AJOUT
    // =====================================================

    const handleAdd = () => {

        setSelectedEmployee(null);
        setShowModal(true);
    };


    // =====================================================
    // MODIFICATION
    // =====================================================

    const handleEdit = (employee) => {

        setSelectedEmployee(employee);
        setShowModal(true);
        setOpenActionId(null);
    };


    // =====================================================
    // DOCUMENTS
    // =====================================================

    const openDocuments = (employee) => {

        setDocumentEmployee(employee);
        setDocumentModalOpen(true);
        setOpenActionId(null);
    };


    const closeDocuments = () => {

        setDocumentModalOpen(false);
        setDocumentEmployee(null);
    };


    // =====================================================
    // ACTIVER / DÉSACTIVER
    // =====================================================

    const handleToggleStatus = async (employee) => {

        const action =
            employee.status === "actif"
                ? "désactiver"
                : "activer";

        const confirmed = window.confirm(
            `Voulez-vous ${action} cet employé ?`
        );

        if (!confirmed) {
            return;
        }

        try {

            setActionLoading(true);

            await api.patch(`/employees/${employee.id}/status`);

            await loadData();

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Impossible de modifier le statut"
            );

        } finally {

            setActionLoading(false);
            setOpenActionId(null);
        }
    };


    // =====================================================
    // SUPPRESSION
    // =====================================================

    const handleDelete = async (employee) => {

        const confirmed = window.confirm(
            `Voulez-vous vraiment supprimer ${employee.first_name} ${employee.last_name} ?`
        );

        if (!confirmed) {
            return;
        }

        try {

            setActionLoading(true);

            await api.delete(`/employees/${employee.id}`);

            await loadData();

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Impossible de supprimer l'employé"
            );

        } finally {

            setActionLoading(false);
            setOpenActionId(null);
        }
    };


    // =====================================================
    // PHOTO
    // =====================================================

    const getPhotoUrl = (photoUrl) => {

        if (!photoUrl) {
            return null;
        }

        return `${import.meta.env.VITE_API_ORIGIN}${photoUrl}`;
    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="employees-page">


            {/* HEADER */}

            <div className="page-header">

                <div>
                    <h1>Employés</h1>
                    <p>Gérez les employés de votre entreprise</p>
                </div>

                <button
                    className="primary-button"
                    onClick={handleAdd}
                >
                    <Plus size={18} />
                    Nouvel employé
                </button>

            </div>


            {/* MINI DASHBOARD */}

            <MiniDashboard
                stats={[
                    {
                        label: "Total employés",
                        value: stats?.total || 0,
                        icon: Users,
                        description: "Tous les employés",
                    },
                    {
                        label: "Employés actifs",
                        value: stats?.active || 0,
                        icon: UserCheck,
                        description: "Employés actuellement actifs",
                    },
                    {
                        label: "Employés inactifs",
                        value: stats?.inactive || 0,
                        icon: UserX,
                        description: "Employés inactifs",
                    },
                    {
                        label: "Nouveaux",
                        value: stats?.recent || 0,
                        icon: UserPlus,
                        description: "Embauchés ces 30 derniers jours",
                    },
                ]}
            />


            {/* CONTENU */}

            <div className="employees-card">


                {/* TOOLBAR */}

                <div className="employees-toolbar">

                    <div className="search-box">

                        <Search size={18} />

                        <input
                            type="text"
                            placeholder="Rechercher un employé..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">Actifs</option>
                        <option value="inactif">Inactifs</option>
                    </select>

                </div>


                {/* TABLE */}

                {loading ? (

                    <div className="table-loading">
                        Chargement des employés...
                    </div>

                ) : filteredEmployees.length === 0 ? (

                    <div className="empty-state">

                        <Users size={42} />

                        <h3>Aucun employé trouvé</h3>

                        <p>
                            Aucun employé ne correspond à votre recherche.
                        </p>

                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>
                                <tr>
                                    <th>Employé</th>
                                    <th>Matricule</th>
                                    <th>Poste</th>
                                    <th>Service</th>
                                    <th>Date d'embauche</th>
                                    <th>Statut</th>
                                    <th>Utilisateur</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredEmployees.map((employee) => (

                                    <tr key={employee.id}>


                                        {/* EMPLOYÉ */}

                                        <td>

                                            <div className="employee-cell">

                                                {getPhotoUrl(employee.photo_url) ? (

                                                    <img
                                                        src={getPhotoUrl(employee.photo_url)}
                                                        alt=""
                                                        className="employee-avatar"
                                                    />

                                                ) : (

                                                    <div className="employee-avatar-placeholder">
                                                        {employee.first_name?.charAt(0).toUpperCase()}
                                                        {employee.last_name?.charAt(0).toUpperCase()}
                                                    </div>

                                                )}

                                                <div>

                                                    <strong>
                                                        {employee.first_name}{" "}
                                                        {employee.last_name}
                                                    </strong>

                                                    <span>
                                                        {employee.email || "Aucun email"}
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        {/* MATRICULE */}

                                        <td>
                                            <span className="matricule">
                                                {employee.matricule}
                                            </span>
                                        </td>


                                        {/* POSTE */}

                                        <td>{employee.position || "—"}</td>


                                        {/* SERVICE */}

                                        <td>{employee.service_name || "—"}</td>


                                        {/* DATE */}

                                        <td>
                                            {employee.hire_date
                                                ? new Date(employee.hire_date).toLocaleDateString("fr-FR")
                                                : "—"}
                                        </td>


                                        {/* STATUT */}

                                        <td>
                                            <span
                                                className={
                                                    employee.status === "actif"
                                                        ? "status-badge active"
                                                        : "status-badge inactive"
                                                }
                                            >
                                                {employee.status === "actif"
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </span>
                                        </td>


                                        {/* UTILISATEUR */}

                                        <td>
                                            {employee.has_user ? (
                                                <span className="user-badge">
                                                    Compte créé
                                                </span>
                                            ) : (
                                                <span className="no-user-badge">
                                                    Aucun compte
                                                </span>
                                            )}
                                        </td>


                                        {/* ACTIONS */}

                                        <td>

                                            <div className="action-container">

                                                <button
                                                    className="action-button"
                                                    onClick={() =>
                                                        setOpenActionId(
                                                            openActionId === employee.id
                                                                ? null
                                                                : employee.id
                                                        )
                                                    }
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {openActionId === employee.id && (

                                                    <div className="action-menu">

                                                        <button
                                                            onClick={() => handleEdit(employee)}
                                                        >
                                                            <Pencil size={15} />
                                                            Modifier
                                                        </button>

                                                        <button
                                                            onClick={() => openDocuments(employee)}
                                                        >
                                                            <FolderOpen size={15} />
                                                            Documents
                                                        </button>

                                                        <button
                                                            onClick={() => handleToggleStatus(employee)}
                                                            disabled={actionLoading}
                                                        >
                                                            <Power size={15} />
                                                            {employee.status === "actif"
                                                                ? "Désactiver"
                                                                : "Activer"}
                                                        </button>

                                                        <button
                                                            className="danger"
                                                            onClick={() => handleDelete(employee)}
                                                            disabled={actionLoading}
                                                        >
                                                            <Trash2 size={15} />
                                                            Supprimer
                                                        </button>

                                                    </div>

                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>


            {/* MODAL EMPLOYÉ */}

            <EmployeeModal
                isOpen={showModal}
                employee={selectedEmployee}
                onClose={() => {
                    setShowModal(false);
                    setSelectedEmployee(null);
                }}
                onSuccess={() => {
                    setShowModal(false);
                    setSelectedEmployee(null);
                    loadData();
                }}
            />


            {/* MODAL DOCUMENTS */}

            <DocumentModal
                employee={documentEmployee}
                isOpen={documentModalOpen}
                onClose={closeDocuments}
            />

        </div>
    );
};


export default Employees;