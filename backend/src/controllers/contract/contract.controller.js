const pool = require("../../config/db");


// =====================================================
// STATISTIQUES
// =====================================================

const getContractStats = async (req, res) => {
    try {

        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                COUNT(*) AS total,

                COUNT(*) FILTER (
                    WHERE status = 'actif'
                ) AS active,

                COUNT(*) FILTER (
                    WHERE status = 'termine'
                ) AS finished,

                COUNT(*) FILTER (
                    WHERE end_date IS NOT NULL
                    AND end_date >= CURRENT_DATE
                    AND end_date <= CURRENT_DATE + INTERVAL '30 days'
                ) AS ending_soon

            FROM employee_contracts

            WHERE company_id = $1
            `,
            [companyId]
        );

        res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Erreur statistiques contrats :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement des statistiques"
        });
    }
};


// =====================================================
// LISTE DES CONTRATS
// =====================================================

const getContracts = async (req, res) => {
    try {

        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT

                c.id,
                c.contract_type,
                c.contract_number,
                c.start_date,
                c.end_date,
                c.salary_base,
                c.position,
                c.trial_period_days,
                c.status,
                c.notes,
                c.created_at,

                e.id AS employee_id,
                e.matricule,
                e.first_name,
                e.last_name,
                e.photo_url,

                s.id AS service_id,
                s.name AS service_name

            FROM employee_contracts c

            INNER JOIN employees e
                ON e.id = c.employee_id

            LEFT JOIN services s
                ON s.id = e.service_id

            WHERE c.company_id = $1

            ORDER BY c.created_at DESC
            `,
            [companyId]
        );

        res.json(result.rows);

    } catch (error) {

        console.error(
            "Erreur récupération contrats :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement des contrats"
        });
    }
};


// =====================================================
// CONTRAT PAR ID
// =====================================================

const getContractById = async (req, res) => {
    try {

        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT

                c.*,

                e.matricule,
                e.first_name,
                e.last_name,
                e.email AS employee_email,
                e.phone AS employee_phone,
                e.photo_url,

                s.name AS service_name

            FROM employee_contracts c

            INNER JOIN employees e
                ON e.id = c.employee_id

            LEFT JOIN services s
                ON s.id = e.service_id

            WHERE c.id = $1
              AND c.company_id = $2
            `,
            [id, companyId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Contrat introuvable"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Erreur récupération contrat :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement du contrat"
        });
    }
};


// =====================================================
// EMPLOYÉS DISPONIBLES
// =====================================================

const getEmployees = async (req, res) => {
    try {

        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                e.id,
                e.matricule,
                e.first_name,
                e.last_name,
                e.position,
                e.status

            FROM employees e

            WHERE e.company_id = $1
              AND e.status = 'actif'

            ORDER BY e.last_name, e.first_name
            `,
            [companyId]
        );

        res.json(result.rows);

    } catch (error) {

        console.error(
            "Erreur récupération employés contrats :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement des employés"
        });
    }
};


// =====================================================
// CREER UN CONTRAT
// =====================================================

const createContract = async (req, res) => {
    try {

        const companyId = req.user.companyId;

        const {
            employee_id,
            contract_type,
            contract_number,
            start_date,
            end_date,
            salary_base,
            position,
            trial_period_days,
            status,
            notes
        } = req.body;


        if (
            !employee_id ||
            !contract_type ||
            !start_date
        ) {

            return res.status(400).json({
                message:
                    "Employé, type de contrat et date de début sont obligatoires"
            });
        }


        // Vérifier que l'employé appartient à l'entreprise

        const employee = await pool.query(
            `
            SELECT id
            FROM employees
            WHERE id = $1
              AND company_id = $2
            `,
            [employee_id, companyId]
        );


        if (employee.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Employé introuvable"
            });
        }


        const result = await pool.query(
            `
            INSERT INTO employee_contracts (
                company_id,
                employee_id,
                contract_type,
                contract_number,
                start_date,
                end_date,
                salary_base,
                position,
                trial_period_days,
                status,
                notes
            )

            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11
            )

            RETURNING *
            `,
            [
                companyId,
                employee_id,
                contract_type,
                contract_number || null,
                start_date,
                end_date || null,
                salary_base || null,
                position || null,
                trial_period_days || 0,
                status || "actif",
                notes || null
            ]
        );


        res.status(201).json({
            message:
                "Contrat créé avec succès",

            contract:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Erreur création contrat :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la création du contrat"
        });
    }
};


// =====================================================
// MODIFIER UN CONTRAT
// =====================================================

const updateContract = async (req, res) => {
    try {

        const companyId = req.user.companyId;
        const { id } = req.params;

        const {
            employee_id,
            contract_type,
            contract_number,
            start_date,
            end_date,
            salary_base,
            position,
            trial_period_days,
            status,
            notes
        } = req.body;


        const result = await pool.query(
            `
            UPDATE employee_contracts

            SET
                employee_id = $1,
                contract_type = $2,
                contract_number = $3,
                start_date = $4,
                end_date = $5,
                salary_base = $6,
                position = $7,
                trial_period_days = $8,
                status = $9,
                notes = $10,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $11
              AND company_id = $12

            RETURNING *
            `,
            [
                employee_id,
                contract_type,
                contract_number || null,
                start_date,
                end_date || null,
                salary_base || null,
                position || null,
                trial_period_days || 0,
                status || "actif",
                notes || null,
                id,
                companyId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Contrat introuvable"
            });
        }


        res.json({
            message:
                "Contrat modifié avec succès",

            contract:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Erreur modification contrat :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la modification du contrat"
        });
    }
};


// =====================================================
// SUPPRIMER UN CONTRAT
// =====================================================

const deleteContract = async (req, res) => {
    try {

        const companyId = req.user.companyId;
        const { id } = req.params;


        const result = await pool.query(
            `
            DELETE FROM employee_contracts

            WHERE id = $1
              AND company_id = $2

            RETURNING id
            `,
            [id, companyId]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Contrat introuvable"
            });
        }


        res.json({
            message:
                "Contrat supprimé avec succès"
        });

    } catch (error) {

        console.error(
            "Erreur suppression contrat :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la suppression du contrat"
        });
    }
};


module.exports = {
    getContractStats,
    getContracts,
    getContractById,
    getEmployees,
    createContract,
    updateContract,
    deleteContract
};