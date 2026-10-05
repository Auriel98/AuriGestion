import React, { useEffect, useMemo, useState } from "react";
import {
    FileText,
    FileCheck,
    Clock,
    CheckCircle,
    Search,
    Plus,
    MoreVertical,
    Pencil,
    Trash2
} from "lucide-react";

import api from "../../api/api";

import MiniDashboard from "../../components/dashboard/MiniDashboard";
import ContractModal from "../../components/contracts/ContractModal";

import "./Contracts.css";


const Contracts = () => {

    const [contracts, setContracts] = useState([]);

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        finished: 0,
        ending_soon: 0
    });

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState("all");

    const [typeFilter, setTypeFilter] =
        useState("all");

    const [showModal, setShowModal] =
        useState(false);

    const [selectedContract, setSelectedContract] =
        useState(null);

    const [openActionId, setOpenActionId] =
        useState(null);

    const [actionLoading, setActionLoading] =
        useState(false);


    // =====================================================
    // CHARGEMENT
    // =====================================================

    const loadData = async () => {

        try {

            setLoading(true);

            const [
                statsData,
                contractsData
            ] = await Promise.all([
                api.get("/contracts/stats"),
                api.get("/contracts")
            ]);

            setStats({
                total: Number(statsData.total || 0),
                active: Number(statsData.active || 0),
                finished: Number(statsData.finished || 0),
                ending_soon:
                    Number(statsData.ending_soon || 0)
            });

            setContracts(contractsData);

        } catch (error) {

            console.error(
                "Erreur chargement contrats :",
                error
            );

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

    const filteredContracts = useMemo(() => {

        const term =
            search.trim().toLowerCase();

        return contracts.filter((contract) => {

            const employeeName =
                `${contract.first_name || ""} ${contract.last_name || ""}`
                    .toLowerCase();

            const matchesSearch =
                !term ||
                employeeName.includes(term) ||
                (contract.matricule || "")
                    .toLowerCase()
                    .includes(term) ||
                (contract.contract_number || "")
                    .toLowerCase()
                    .includes(term) ||
                (contract.position || "")
                    .toLowerCase()
                    .includes(term);

            const matchesStatus =
                statusFilter === "all" ||
                contract.status === statusFilter;

            const matchesType =
                typeFilter === "all" ||
                contract.contract_type === typeFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesType
            );
        });

    }, [
        contracts,
        search,
        statusFilter,
        typeFilter
    ]);


    // =====================================================
    // MODIFIER
    // =====================================================

    const handleEdit = (contract) => {

        setSelectedContract(contract);

        setShowModal(true);

        setOpenActionId(null);
    };


    // =====================================================
    // SUPPRIMER
    // =====================================================

    const handleDelete = async (contract) => {

        const employeeName =
            `${contract.first_name} ${contract.last_name}`;

        const confirmed =
            window.confirm(
                `Voulez-vous vraiment supprimer le contrat de ${employeeName} ?`
            );

        if (!confirmed) return;


        try {

            setActionLoading(true);

            await api.delete(
                `/contracts/${contract.id}`
            );

            await loadData();

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "Impossible de supprimer le contrat."
            );

        } finally {

            setActionLoading(false);

            setOpenActionId(null);
        }
    };


    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (date) => {

        if (!date) return "—";

        return new Date(date).toLocaleDateString(
            "fr-FR"
        );
    };


    // =====================================================
    // FORMAT SALAIRE
    // =====================================================

    const formatSalary = (salary) => {

        if (
            salary === null ||
            salary === undefined ||
            salary === ""
        ) {
            return "—";
        }

        return `${Number(salary).toLocaleString(
            "fr-FR"
        )} FCFA`;
    };


    // =====================================================
    // TYPE
    // =====================================================

    const getContractTypeLabel = (type) => {

        const labels = {
            CDI: "CDI",
            CDD: "CDD",
            STAGE: "Stage",
            INTERIM: "Intérim",
            PRESTATION: "Prestation",
            AUTRE: "Autre"
        };

        return labels[type] || type;
    };


    // =====================================================
    // STATUT
    // =====================================================

    const getStatusLabel = (status) => {

        const labels = {
            actif: "Actif",
            termine: "Terminé",
            suspendu: "Suspendu",
            resilie: "Résilié"
        };

        return labels[status] || status;
    };


    const getStatusClass = (status) => {

        return `contract-status contract-status-${status}`;
    };


    return (
        <div className="contracts-page">

            {/* HEADER */}

            <div className="contracts-header">

                <div>

                    <h1>
                        Contrats
                    </h1>

                    <p>
                        Gestion des contrats des employés
                    </p>

                </div>


                <button
                    className="contracts-add-button"
                    onClick={() => {

                        setSelectedContract(null);

                        setShowModal(true);

                    }}
                >
                    <Plus size={18} />

                    Nouveau contrat
                </button>

            </div>


            {/* MINI DASHBOARD */}

            <MiniDashboard
                stats={[
                    {
                        label: "Total contrats",
                        value: stats.total,
                        icon: FileText,
                        description:
                            "Tous les contrats"
                    },
                    {
                        label: "Contrats actifs",
                        value: stats.active,
                        icon: FileCheck,
                        description:
                            "Contrats en cours"
                    },
                    {
                        label: "Terminés",
                        value: stats.finished,
                        icon: CheckCircle,
                        description:
                            "Contrats terminés"
                    },
                    {
                        label: "Échéance proche",
                        value: stats.ending_soon,
                        icon: Clock,
                        description:
                            "Dans les 30 prochains jours"
                    }
                ]}
            />


            {/* FILTRES */}

            <div className="contracts-toolbar">

                <div className="contracts-search">

                    <Search size={17} />

                    <input
                        type="text"
                        placeholder="Rechercher un employé, matricule, contrat..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>


                <select
                    value={typeFilter}
                    onChange={(e) =>
                        setTypeFilter(e.target.value)
                    }
                >

                    <option value="all">
                        Tous les contrats
                    </option>

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


                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value)
                    }
                >

                    <option value="all">
                        Tous les statuts
                    </option>

                    <option value="actif">
                        Actifs
                    </option>

                    <option value="termine">
                        Terminés
                    </option>

                    <option value="suspendu">
                        Suspendus
                    </option>

                    <option value="resilie">
                        Résiliés
                    </option>

                </select>

            </div>


            {/* TABLE */}

            <div className="contracts-table-container">

                {loading ? (

                    <div className="contracts-empty">
                        Chargement des contrats...
                    </div>

                ) : filteredContracts.length === 0 ? (

                    <div className="contracts-empty">

                        <FileText size={40} />

                        <h3>
                            Aucun contrat
                        </h3>

                        <p>
                            {search ||
                            statusFilter !== "all" ||
                            typeFilter !== "all"
                                ? "Aucun contrat ne correspond aux filtres."
                                : "Commencez par créer un contrat."}
                        </p>

                    </div>

                ) : (

                    <table className="contracts-table">

                        <thead>

                            <tr>

                                <th>
                                    Employé
                                </th>

                                <th>
                                    Contrat
                                </th>

                                <th>
                                    Période
                                </th>

                                <th>
                                    Salaire
                                </th>

                                <th>
                                    Poste
                                </th>

                                <th>
                                    Statut
                                </th>

                                <th>
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {filteredContracts.map(
                                (contract) => (

                                    <tr key={contract.id}>

                                        {/* EMPLOYÉ */}

                                        <td>

                                            <div className="contract-employee">

                                                <div className="contract-avatar">

                                                    {contract.photo_url ? (

                                                        <img
                                                            src={`${import.meta.env.VITE_API_ORIGIN}${contract.photo_url}`}
                                                            alt=""
                                                        />

                                                    ) : (

                                                        <span>
                                                            {contract.first_name?.charAt(0)}
                                                            {contract.last_name?.charAt(0)}
                                                        </span>

                                                    )}

                                                </div>


                                                <div>

                                                    <strong>
                                                        {contract.last_name}{" "}
                                                        {contract.first_name}
                                                    </strong>

                                                    <small>
                                                        {contract.matricule}
                                                    </small>

                                                </div>

                                            </div>

                                        </td>


                                        {/* CONTRAT */}

                                        <td>

                                            <div className="contract-info">

                                                <span className="contract-type">
                                                    {getContractTypeLabel(
                                                        contract.contract_type
                                                    )}
                                                </span>

                                                <small>
                                                    {contract.contract_number ||
                                                        "Sans numéro"}
                                                </small>

                                            </div>

                                        </td>


                                        {/* PÉRIODE */}

                                        <td>

                                            <div className="contract-dates">

                                                <span>
                                                    {formatDate(
                                                        contract.start_date
                                                    )}
                                                </span>

                                                <span>
                                                    →
                                                </span>

                                                <span>
                                                    {formatDate(
                                                        contract.end_date
                                                    )}
                                                </span>

                                            </div>

                                        </td>


                                        {/* SALAIRE */}

                                        <td>

                                            <span className="contract-salary">

                                                {formatSalary(
                                                    contract.salary_base
                                                )}

                                            </span>

                                        </td>


                                        {/* POSTE */}

                                        <td>

                                            {contract.position ||
                                                "—"}

                                        </td>


                                        {/* STATUT */}

                                        <td>

                                            <span
                                                className={getStatusClass(
                                                    contract.status
                                                )}
                                            >
                                                {getStatusLabel(
                                                    contract.status
                                                )}
                                            </span>

                                        </td>


                                        {/* ACTIONS */}

                                        <td className="contract-actions-cell">

                                            <button
                                                className="contract-actions-button"
                                                onClick={() =>
                                                    setOpenActionId(
                                                        openActionId === contract.id
                                                            ? null
                                                            : contract.id
                                                    )
                                                }
                                            >
                                                <MoreVertical size={18} />
                                            </button>


                                            {openActionId === contract.id && (

                                                <div className="contract-actions-menu">

                                                    <button
                                                        onClick={() =>
                                                            handleEdit(contract)
                                                        }
                                                    >

                                                        <Pencil size={15} />

                                                        Modifier

                                                    </button>


                                                    <button
                                                        className="danger"
                                                        disabled={actionLoading}
                                                        onClick={() =>
                                                            handleDelete(contract)
                                                        }
                                                    >

                                                        <Trash2 size={15} />

                                                        Supprimer

                                                    </button>

                                                </div>

                                            )}

                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>

                )}

            </div>


            {/* MODAL */}

            <ContractModal
                isOpen={showModal}
                contract={selectedContract}

                onClose={() => {

                    setShowModal(false);

                    setSelectedContract(null);

                }}

                onSuccess={loadData}
            />

        </div>
    );
};


export default Contracts;