const pool = require("../../config/db");


// =====================================================
// CONFIGURATION
// =====================================================

// Fuseau horaire utilisé pour déterminer "aujourd'hui".
const TIMEZONE = "Africa/Libreville";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Statuts de la journée (doivent correspondre à la contrainte SQL)
//   worked        = Travaillé
//   absent        = Absent
//   leave         = Congé
//   sick          = Maladie
//   not_scheduled = Non programmé (ce n'est PAS une absence)
const STATUSES = [
    "worked",
    "absent",
    "leave",
    "sick",
    "not_scheduled"
];

const NOTES_MAX_LENGTH = 500;


// =====================================================
// UTILITAIRES
// =====================================================

// Date du jour au format YYYY-MM-DD (heure de Libreville)
const todayLocal = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });


const isValidDate = (value) =>
    typeof value === "string" &&
    DATE_REGEX.test(value) &&
    !Number.isNaN(Date.parse(value));


// Date demandée (?date=YYYY-MM-DD) ou aujourd'hui
const getWorkDate = (req) => {
    const { date } = req.query;

    return isValidDate(date) ? date : todayLocal();
};


// Heure optionnelle : "" / null / undefined -> null
// Retourne undefined si le format est invalide
const parseOptionalTime = (value) => {

    if (value === undefined || value === null) return null;

    if (typeof value !== "string") return undefined;

    const trimmed = value.trim();

    if (trimmed === "") return null;

    return TIME_REGEX.test(trimmed) ? trimmed : undefined;
};


// =====================================================
// MINI DASHBOARD
// =====================================================
// Un employé sans pointage n'est PAS considéré absent :
// il est "non renseigné" (pending) tant que rien n'est saisi.

const getAttendanceStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const workDate = getWorkDate(req);

        const result = await pool.query(
            `
            SELECT
                COUNT(e.id) AS total_employees,

                COUNT(*) FILTER (
                    WHERE a.status = 'worked'
                ) AS worked,

                COUNT(*) FILTER (
                    WHERE a.status = 'absent'
                ) AS absent,

                COUNT(*) FILTER (
                    WHERE a.status = 'leave'
                ) AS on_leave,

                COUNT(*) FILTER (
                    WHERE a.status = 'sick'
                ) AS sick,

                COUNT(*) FILTER (
                    WHERE a.status = 'not_scheduled'
                ) AS not_scheduled,

                COUNT(*) FILTER (
                    WHERE a.id IS NULL
                ) AS pending

            FROM employees e

            LEFT JOIN attendance_records a
                ON a.employee_id = e.id
                AND a.company_id = e.company_id
                AND a.work_date = $2::date

            WHERE e.company_id = $1
            AND e.status = 'actif'
            `,
            [companyId, workDate]
        );

        const row = result.rows[0];

        const total = Number(row.total_employees);
        const worked = Number(row.worked);
        const absent = Number(row.absent);
        const onLeave = Number(row.on_leave);
        const sick = Number(row.sick);
        const notScheduled = Number(row.not_scheduled);
        const pending = Number(row.pending);

        // Taux de présence calculé sur les employés programmés
        // (les "non programmés" ne comptent pas dans la base).
        const scheduled = total - notScheduled;

        const attendanceRate =
            scheduled > 0
                ? Math.round((worked / scheduled) * 100)
                : 0;

        return res.json({
            date: workDate,
            total,
            worked,
            absent,
            on_leave: onLeave,
            sick,
            not_scheduled: notScheduled,
            pending,
            attendance_rate: attendanceRate
        });

    } catch (error) {

        console.error(
            "Erreur statistiques présence :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors du chargement des statistiques."
        });
    }
};


// =====================================================
// LISTE DES EMPLOYES + PRESENCE
// =====================================================
// status = null  -> rien n'a encore été saisi pour ce jour

const getAttendance = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const workDate = getWorkDate(req);

        const result = await pool.query(
            `
            SELECT

                e.id AS employee_id,

                e.matricule,

                e.first_name,

                e.last_name,

                e.photo_url,

                e.position,

                s.name AS service_name,

                a.id AS attendance_id,

                to_char(a.work_date, 'YYYY-MM-DD') AS work_date,

                a.status,

                to_char(a.check_in, 'HH24:MI') AS check_in,

                to_char(a.check_out, 'HH24:MI') AS check_out,

                a.notes

            FROM employees e

            LEFT JOIN services s
                ON s.id = e.service_id

            LEFT JOIN attendance_records a
                ON a.employee_id = e.id
                AND a.company_id = e.company_id
                AND a.work_date = $2::date

            WHERE e.company_id = $1
            AND e.status = 'actif'

            ORDER BY
                e.last_name ASC,
                e.first_name ASC
            `,
            [companyId, workDate]
        );

        return res.json({
            date: workDate,
            employees: result.rows
        });

    } catch (error) {

        console.error(
            "Erreur liste présence :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors du chargement des présences."
        });
    }
};


// =====================================================
// ENREGISTRER / MODIFIER LE POINTAGE D'UNE JOURNEE
// =====================================================
// Body JSON :
// {
//   "employee_id": "uuid",
//   "work_date":   "2026-10-03",      (optionnel, défaut = aujourd'hui)
//   "status":      "worked",
//   "check_in":    "09:30",           (optionnel)
//   "check_out":   "19:15",           (optionnel)
//   "notes":       "Attente du matériel"  (optionnel)
// }
//
// Si le pointage existe déjà pour ce jour, il est mis à jour.
// Aucun calcul de retard, d'heures travaillées ou d'heures
// supplémentaires : cela relève du module Paie.

const saveAttendance = async (req, res) => {

    const companyId = req.user.companyId;

    const {
        employee_id,
        work_date,
        status,
        check_in,
        check_out,
        notes
    } = req.body;


    // -------------------------------------------------
    // Validation
    // -------------------------------------------------

    if (!employee_id) {
        return res.status(400).json({
            message: "L'employé est obligatoire."
        });
    }

    if (!STATUSES.includes(status)) {
        return res.status(400).json({
            message: "Le statut de la journée est invalide."
        });
    }

    let workDate = todayLocal();

    if (work_date !== undefined && work_date !== null && work_date !== "") {

        if (!isValidDate(work_date)) {
            return res.status(400).json({
                message: "La date est invalide (format AAAA-MM-JJ)."
            });
        }

        workDate = work_date;
    }

    let checkInTime = parseOptionalTime(check_in);
    let checkOutTime = parseOptionalTime(check_out);

    if (checkInTime === undefined || checkOutTime === undefined) {
        return res.status(400).json({
            message: "Heure invalide (format HH:MM)."
        });
    }

    // Les heures n'ont de sens que si l'employé a travaillé
    if (status !== "worked") {
        checkInTime = null;
        checkOutTime = null;
    }

    let cleanNotes = null;

    if (typeof notes === "string" && notes.trim() !== "") {

        cleanNotes = notes.trim();

        if (cleanNotes.length > NOTES_MAX_LENGTH) {
            return res.status(400).json({
                message:
                    `La note ne doit pas dépasser ${NOTES_MAX_LENGTH} caractères.`
            });
        }
    }


    try {

        // -------------------------------------------------
        // Vérifier l'employé
        // -------------------------------------------------

        const employeeResult = await pool.query(
            `
            SELECT id

            FROM employees

            WHERE id = $1
            AND company_id = $2
            AND status = 'actif'
            `,
            [
                employee_id,
                companyId
            ]
        );

        if (employeeResult.rowCount === 0) {
            return res.status(404).json({
                message: "Employé introuvable."
            });
        }


        // -------------------------------------------------
        // Création ou mise à jour (un seul pointage par jour)
        // -------------------------------------------------
        // Si le départ est "plus petit" que l'arrivée
        // (ex : 22:00 -> 02:00), il tombe le lendemain.

        const result = await pool.query(
            `
            INSERT INTO attendance_records (
                company_id,
                employee_id,
                work_date,
                status,
                check_in,
                check_out,
                notes
            )

            VALUES (
                $1,
                $2,
                $3::date,
                $4,

                CASE
                    WHEN $5::time IS NULL THEN NULL
                    ELSE ($3::date + $5::time)
                END,

                CASE
                    WHEN $6::time IS NULL THEN NULL
                    WHEN $5::time IS NOT NULL
                         AND $6::time < $5::time
                    THEN ($3::date + $6::time + INTERVAL '1 day')
                    ELSE ($3::date + $6::time)
                END,

                $7
            )

            ON CONFLICT (company_id, employee_id, work_date)

            DO UPDATE SET
                status = EXCLUDED.status,
                check_in = EXCLUDED.check_in,
                check_out = EXCLUDED.check_out,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP

            RETURNING
                id,
                to_char(work_date, 'YYYY-MM-DD') AS work_date,
                status,
                to_char(check_in, 'HH24:MI') AS check_in,
                to_char(check_out, 'HH24:MI') AS check_out,
                notes
            `,
            [
                companyId,
                employee_id,
                workDate,
                status,
                checkInTime,
                checkOutTime,
                cleanNotes
            ]
        );

        return res.json({
            message: "Pointage enregistré.",
            attendance: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Erreur enregistrement pointage :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de l'enregistrement du pointage."
        });
    }
};


module.exports = {
    getAttendanceStats,
    getAttendance,
    saveAttendance
};