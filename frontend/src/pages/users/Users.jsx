import React, {
    useEffect,
    useState,
} from "react";

import {
    Users as UsersIcon,
    UserCheck,
    UserX,
    Shield,
    Search,
    Plus,
    MoreVertical,
    Pencil,
    Power,
    Trash2,
} from "lucide-react";

import api, {
    API_ORIGIN,
} from "../../api/api";

import MiniDashboard
    from "../../components/dashboard/MiniDashboard";

import UserModal
    from "./UserModal";

import "./Users.css";


const Users = () => {

    const [users, setUsers] =
        useState([]);

    const [stats, setStats] =
        useState({
            total: 0,
            active: 0,
            inactive: 0,
            roles: 0,
        });

    const [loading, setLoading] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [showModal, setShowModal] =
        useState(false);

    const [selectedUser, setSelectedUser] =
        useState(null);

    const [openActionId, setOpenActionId] =
        useState(null);

    const [actionLoading, setActionLoading] =
        useState(false);


    // ========================================================
    // CHARGEMENT  (/users/stats + /users)
    // ========================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const [
                statsData,
                usersData,
            ] = await Promise.all([
                api.get("/users/stats"),
                api.get("/users"),
            ]);

            setStats({
                total: Number(statsData.total || 0),
                active: Number(statsData.active || 0),
                inactive: Number(statsData.inactive || 0),
                roles: Number(statsData.roles || 0),
            });

            setUsers(
                Array.isArray(usersData)
                    ? usersData
                    : []
            );

        } catch (error) {

            console.error(
                "Erreur chargement utilisateurs :",
                error
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {

        loadData();

    }, []);


    // ========================================================
    // ACTIONS
    // ========================================================

    const handleEdit = (user) => {
        setOpenActionId(null);
        setSelectedUser(user);
        setShowModal(true);
    };


    const handleToggleStatus = async (user) => {

        const action = user.is_active
            ? "désactiver"
            : "activer";

        const confirmed = window.confirm(
            `Voulez-vous vraiment ${action} le compte de ${user.first_name} ${user.last_name} ?`
        );

        if (!confirmed) return;

        try {

            setActionLoading(true);

            await api.patch(
                `/users/${user.id}/status`
            );

            setOpenActionId(null);

            await loadData();

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Impossible de modifier le statut."
            );

        } finally {

            setActionLoading(false);

        }
    };


    const handleDelete = async (user) => {

        const confirmed = window.confirm(
            `Voulez-vous vraiment supprimer le compte de ${user.first_name} ${user.last_name} ?\n\nCette action est définitive.`
        );

        if (!confirmed) return;

        try {

            setActionLoading(true);

            await api.delete(
                `/users/${user.id}`
            );

            setOpenActionId(null);

            await loadData();

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Impossible de supprimer l'utilisateur."
            );

        } finally {

            setActionLoading(false);

        }
    };


    // ========================================================
    // RECHERCHE
    // ========================================================

    const filteredUsers =
        users.filter((user) => {

            const searchValue =
                search.toLowerCase().trim();

            if (!searchValue) {
                return true;
            }

            const fullName =
                `${user.first_name || ""} ${user.last_name || ""}`
                    .toLowerCase();

            return (
                fullName.includes(searchValue) ||
                (user.email || "")
                    .toLowerCase()
                    .includes(searchValue) ||
                (user.role_name || user.role || "")
                    .toLowerCase()
                    .includes(searchValue)
            );
        });


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="users-page">

            {/* HEADER */}

            <div className="page-header">

                <div />

                <button
                    className="primary-button users-add-button"
                    type="button"
                    onClick={() => {
                        setSelectedUser(null);
                        setShowModal(true);
                    }}
                >
                    <Plus size={18} />

                    Nouvel utilisateur
                </button>

            </div>


            {/* MINI DASHBOARD */}

            <MiniDashboard
                stats={[
                    {
                        label: "Utilisateurs",
                        value: stats.total,
                        icon: UsersIcon,
                    },
                    {
                        label: "Actifs",
                        value: stats.active,
                        icon: UserCheck,
                    },
                    {
                        label: "Inactifs",
                        value: stats.inactive,
                        icon: UserX,
                    },
                    {
                        label: "Rôles",
                        value: stats.roles,
                        icon: Shield,
                    },
                ]}
            />


            {/* TABLEAU */}

            <div className="users-card">

                <div className="users-toolbar">

                    <div className="search-box">

                        <Search size={18} />

                        <input
                            type="text"
                            placeholder="Rechercher un utilisateur..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />

                    </div>

                </div>


                <div className="table-container">

                    <table>

                        <thead>

                            <tr>
                                <th>Utilisateur</th>
                                <th>Email</th>
                                <th>Rôle</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>

                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>
                                    <td
                                        colSpan="5"
                                        className="table-message"
                                    >
                                        Chargement...
                                    </td>
                                </tr>

                            ) : filteredUsers.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan="5"
                                        className="table-message"
                                    >
                                        Aucun utilisateur trouvé.
                                    </td>
                                </tr>

                            ) : (

                                filteredUsers.map((user) => (

                                    <tr key={user.id}>

                                        <td>

                                            <div className="user-cell">

                                                {user.photo_url ? (

                                                    <img
                                                        src={`${API_ORIGIN}${user.photo_url}`}
                                                        alt=""
                                                    />

                                                ) : (

                                                    <div className="user-avatar">
                                                        {user.first_name?.charAt(0)}
                                                        {user.last_name?.charAt(0)}
                                                    </div>

                                                )}

                                                <div>

                                                    <strong>
                                                        {user.first_name}{" "}
                                                        {user.last_name}
                                                    </strong>

                                                    <span>
                                                        {user.position || "—"}
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        <td>
                                            {user.email}
                                        </td>


                                        <td>
                                            <span className="role-badge">
                                                {user.role_name ||
                                                    user.role ||
                                                    "—"}
                                            </span>
                                        </td>


                                        <td>
                                            <span
                                                className={
                                                    user.is_active
                                                        ? "status-badge active"
                                                        : "status-badge inactive"
                                                }
                                            >
                                                {user.is_active
                                                    ? "Actif"
                                                    : "Inactif"}
                                            </span>
                                        </td>


                                        <td className="users-actions-cell">

                                            <button
                                                className="users-action-button"
                                                type="button"
                                                onClick={() =>
                                                    setOpenActionId(
                                                        openActionId === user.id
                                                            ? null
                                                            : user.id
                                                    )
                                                }
                                                disabled={actionLoading}
                                            >
                                                <MoreVertical size={18} />
                                            </button>


                                            {openActionId === user.id && (

                                                <div className="users-action-menu">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleEdit(user)
                                                        }
                                                    >
                                                        <Pencil size={16} />

                                                        <span>
                                                            Modifier
                                                        </span>
                                                    </button>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleStatus(user)
                                                        }
                                                    >
                                                        <Power size={16} />

                                                        <span>
                                                            {user.is_active
                                                                ? "Désactiver"
                                                                : "Activer"}
                                                        </span>
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() =>
                                                            handleDelete(user)
                                                        }
                                                    >
                                                        <Trash2 size={16} />

                                                        <span>
                                                            Supprimer
                                                        </span>
                                                    </button>

                                                </div>

                                            )}

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* MODALE */}

            <UserModal
                isOpen={showModal}
                user={selectedUser}
                onClose={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                }}
                onSuccess={loadData}
            />

        </div>
    );
};

export default Users;