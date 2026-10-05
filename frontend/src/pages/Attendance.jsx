import React, { useEffect, useState } from "react";
import {
    Clock,
    Save,
    Search,
    Users,
    UserCheck,
    UserX,
    CalendarDays
} from "lucide-react";

import api from "../api/api";
import MiniDashboard from "../components/dashboard/MiniDashboard";

import "./Attendance.css";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN;


// Statuts de la journée (doivent correspondre à la base)
const STATUS_OPTIONS = [
    { value: "worked", label: "Travaillé" },
    { value: "absent", label: "Absent" },
    { value: "leave", label: "Congé" },
    { value: "sick", label: "Maladie" },
    { value: "not_scheduled", label: "Non programmé" }
];


// Date du jour (heure locale, pas UTC)
const getToday = () => {
    return new Date().toLocaleDateString("en-CA");
};


// Valeurs d'origine d'une ligne (ce qui est enregistré)
const getOriginal = (employee) => ({
    status: employee.status || "",
    check_in: employee.check_in || "",
    check_out: employee.check_out || "",
    notes: employee.notes || ""
});


const Attendance = () => {

    const [date, setDate] = useState(getToday());

    const [employees, setEmployees] = useState([]);

    const [stats, setStats] = useState({
        total: 0,
        worked: 0,
        absent: 0,
        on_leave: 0,
        sick: 0,
        not_scheduled: 0,
        pending: 0,
        attendance_rate: 0
    });

    // Modifications non enregistrées, par employé :
    // { [employee_id]: { status?, check_in?, check_out?, notes? } }
    const [drafts, setDrafts] = useState({});

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    const [processingId, setProcessingId] = useState(null);


    // =====================================================
    // CHARGER LES DONNEES
    // =====================================================

    const loadAttendance = async (silent = false) => {

        try {

            if (!silent) setLoading(true);

            const [attendanceResponse, statsResponse] =
                await Promise.all([
                    api.get(`/attendance?date=${date}`),
                    api.get(`/attendance/stats?date=${date}`)
                ]);

            setEmployees(
                attendanceResponse.employees || []
            );

            setStats(
                statsResponse
            );

        } catch (error) {

            console.error(
                "Erreur chargement présence :",
                error
            );

        } finally {

            if (!silent) setLoading(false);

        }
    };


    // Changement de date : on repart de zéro
    useEffect(() => {
        setDrafts({});
        loadAttendance();
    }, [date]);


    // =====================================================
    // EDITION D'UNE LIGNE
    // =====================================================

    const updateDraft = (employeeId, field, value) => {

        setDrafts((previous) => ({
            ...previous,
            [employeeId]: {
                ...previous[employeeId],
                [field]: value
            }
        }));
    };


    // =====================================================
    // ENREGISTRER UN POINTAGE
    // =====================================================

    const handleSave = async (employee) => {

        const current = {
            ...getOriginal(employee),
            ...drafts[employee.employee_id]
        };

        if (!current.status) {
            alert("Choisis d'abord le statut de la journée.");
            return;
        }

        const isWorked = current.status === "worked";

        const payload = {
            employee_id: employee.employee_id,
            work_date: date,
            status: current.status,
            check_in: isWorked ? current.check_in : "",
            check_out: isWorked ? current.check_out : "",
            notes: current.notes
        };

        try {

            setProcessingId(employee.employee_id);

            // Création si aucun pointage ce jour-là, sinon modification
            if (employee.attendance_id) {
                await api.put("/attendance", payload);
            } else {
                await api.post("/attendance", payload);
            }

            // Cette ligne n'a plus de modification en attente
            setDrafts((previous) => {
                const next = { ...previous };
                delete next[employee.employee_id];
                return next;
            });

            await loadAttendance(true);

        } catch (error) {

            alert(
                error.message ||
                "Impossible d'enregistrer le pointage."
            );

        } finally {

            setProcessingId(null);

        }
    };


    // =====================================================
    // RECHERCHE
    // =====================================================

    const filteredEmployees = employees.filter(
        (employee) => {

            const value =
                `${employee.first_name} ${employee.last_name} ${employee.matricule} ${employee.position || ""}`
                    .toLowerCase();

            return value.includes(
                search.toLowerCase()
            );
        }
    );


    // =====================================================
    // MINI DASHBOARD
    // =====================================================

    const dashboardStats = [

        {
            label: "Ont travaillé",
            value: stats.worked,
            icon: UserCheck,
            description: `${stats.attendance_rate}% des employés programmés`
        },

        {
            label: "Absents",
            value: stats.absent,
            icon: UserX,
            description: `${stats.total} employés actifs`
        },

        {
            label: "Congé / Maladie",
            value: stats.on_leave + stats.sick,
            icon: CalendarDays,
            description: `${stats.not_scheduled} non programmé${stats.not_scheduled > 1 ? "s" : ""}`
        },

        {
            label: "Non renseignés",
            value: stats.pending,
            icon: Clock,
            description: "Pointage pas encore saisi"
        }

    ];


    return (
        <div className="attendance-page">

            {/* =================================================
                EN-TETE
            ================================================= */}

            <div className="page-header">

                <div>
                    <h1>Présences</h1>

                    <p>
                        Indique pour chaque employé s'il a travaillé,
                        avec ses heures si nécessaire. Le calcul de la
                        paie se fait dans le module Paie.
                    </p>
                </div>

                <div className="attendance-date">

                    <CalendarDays size={18} />

                    <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                            setDate(e.target.value)
                        }
                    />

                </div>

            </div>


            {/* =================================================
                MINI DASHBOARD
            ================================================= */}

            <MiniDashboard
                stats={dashboardStats}
            />


            {/* =================================================
                BARRE D'OUTILS
            ================================================= */}

            <div className="attendance-toolbar">

                <div className="attendance-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Rechercher un employé..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                </div>

                <div className="attendance-count">

                    <Users size={17} />

                    {filteredEmployees.length} employé
                    {filteredEmployees.length > 1 ? "s" : ""}

                </div>

            </div>


            {/* =================================================
                TABLEAU
            ================================================= */}

            <div className="attendance-card">

                {loading ? (

                    <div className="attendance-loading">
                        Chargement des présences...
                    </div>

                ) : (

                    <div className="attendance-table-wrapper">

                        <table className="attendance-table">

                            <thead>

                                <tr>

                                    <th>Employé</th>

                                    <th>Service</th>

                                    <th>Statut</th>

                                    <th>Arrivée</th>

                                    <th>Départ</th>

                                    <th>Note</th>

                                    <th>Action</th>

                                </tr>

                            </thead>

                            <tbody>

                                {filteredEmployees.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="empty-row"
                                        >
                                            Aucun employé trouvé.
                                        </td>

                                    </tr>

                                ) : (

                                    filteredEmployees.map(
                                        (employee) => {

                                            const photoUrl =
                                                employee.photo_url
                                                    ? `${API_ORIGIN}${employee.photo_url}`
                                                    : null;

                                            const original =
                                                getOriginal(employee);

                                            const current = {
                                                ...original,
                                                ...drafts[
                                                    employee.employee_id
                                                ]
                                            };

                                            const isWorked =
                                                current.status ===
                                                "worked";

                                            const isDirty =
                                                Object.keys(
                                                    original
                                                ).some(
                                                    (key) =>
                                                        original[key] !==
                                                        current[key]
                                                );

                                            const isProcessing =
                                                processingId ===
                                                employee.employee_id;

                                            return (

                                                <tr
                                                    key={
                                                        employee.employee_id
                                                    }
                                                >

                                                    {/* EMPLOYE */}

                                                    <td>

                                                        <div className="attendance-employee">

                                                            {photoUrl ? (

                                                                <img
                                                                    src={photoUrl}
                                                                    alt=""
                                                                    className="attendance-avatar"
                                                                />

                                                            ) : (

                                                                <div className="attendance-avatar attendance-avatar-placeholder">

                                                                    {employee.first_name?.[0]}
                                                                    {employee.last_name?.[0]}

                                                                </div>

                                                            )}

                                                            <div>

                                                                <strong>
                                                                    {employee.first_name}{" "}
                                                                    {employee.last_name}
                                                                </strong>

                                                                <span>
                                                                    {employee.matricule}
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>


                                                    {/* SERVICE */}

                                                    <td>

                                                        <span className="attendance-service">

                                                            {employee.service_name ||
                                                                employee.position ||
                                                                "—"}

                                                        </span>

                                                    </td>


                                                    {/* STATUT */}

                                                    <td>

                                                        <select
                                                            className={`attendance-select status-${current.status || "none"}`}
                                                            value={
                                                                current.status
                                                            }
                                                            onChange={(e) =>
                                                                updateDraft(
                                                                    employee.employee_id,
                                                                    "status",
                                                                    e.target.value
                                                                )
                                                            }
                                                        >

                                                            <option value="">
                                                                — Non renseigné —
                                                            </option>

                                                            {STATUS_OPTIONS.map(
                                                                (option) => (

                                                                    <option
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        value={
                                                                            option.value
                                                                        }
                                                                    >
                                                                        {option.label}
                                                                    </option>

                                                                )
                                                            )}

                                                        </select>

                                                    </td>


                                                    {/* ARRIVEE (optionnelle) */}

                                                    <td>

                                                        <input
                                                            type="time"
                                                            className="attendance-time-input"
                                                            disabled={
                                                                !isWorked
                                                            }
                                                            value={
                                                                isWorked
                                                                    ? current.check_in
                                                                    : ""
                                                            }
                                                            onChange={(e) =>
                                                                updateDraft(
                                                                    employee.employee_id,
                                                                    "check_in",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />

                                                    </td>


                                                    {/* DEPART (optionnel) */}

                                                    <td>

                                                        <input
                                                            type="time"
                                                            className="attendance-time-input"
                                                            disabled={
                                                                !isWorked
                                                            }
                                                            value={
                                                                isWorked
                                                                    ? current.check_out
                                                                    : ""
                                                            }
                                                            onChange={(e) =>
                                                                updateDraft(
                                                                    employee.employee_id,
                                                                    "check_out",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />

                                                    </td>


                                                    {/* NOTE (optionnelle) */}

                                                    <td>

                                                        <input
                                                            type="text"
                                                            className="attendance-note-input"
                                                            placeholder="Note..."
                                                            maxLength={500}
                                                            value={
                                                                current.notes
                                                            }
                                                            onChange={(e) =>
                                                                updateDraft(
                                                                    employee.employee_id,
                                                                    "notes",
                                                                    e.target.value
                                                                )
                                                            }
                                                        />

                                                    </td>


                                                    {/* ACTION */}

                                                    <td>

                                                        <div className="attendance-actions">

                                                            <button
                                                                className="attendance-action-btn check-in-btn"
                                                                disabled={
                                                                    isProcessing ||
                                                                    !isDirty ||
                                                                    !current.status
                                                                }
                                                                onClick={() =>
                                                                    handleSave(
                                                                        employee
                                                                    )
                                                                }
                                                            >

                                                                <Save
                                                                    size={16}
                                                                />

                                                                {isProcessing
                                                                    ? "..."
                                                                    : "Enregistrer"}

                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>
    );
};


export default Attendance;