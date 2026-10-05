const pool = require("../../config/db");
const bcrypt = require("bcryptjs");


// ============================================================
// STATISTIQUES DU MINI-DASHBOARD
// ============================================================

const getUserStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                COUNT(*)::INTEGER AS total,

                COUNT(*) FILTER (
                    WHERE u.is_active = true
                )::INTEGER AS active,

                COUNT(*) FILTER (
                    WHERE u.is_active = false
                )::INTEGER AS inactive,

                COUNT(DISTINCT u.role)::INTEGER AS roles

            FROM users u

            WHERE u.company_id = $1
            `,
            [companyId]
        );

        return res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Erreur statistiques utilisateurs :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors du chargement des statistiques",
        });
    }
};


// ============================================================
// LISTE DES UTILISATEURS
// ============================================================

const getUsers = async (req, res) => {

    try {

        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                u.id,
                u.email,
                u.role,
                u.is_active,
                u.created_at,

                e.id AS employee_id,
                e.first_name,
                e.last_name,
                e.position,
                e.photo_url,

                r.id AS role_id,
                r.name AS role_name,
                r.slug AS role_slug

            FROM users u

            INNER JOIN employees e
                ON e.id = u.employee_id

            LEFT JOIN roles r
                ON r.slug = u.role
                AND r.company_id = u.company_id

            WHERE u.company_id = $1

            ORDER BY e.last_name ASC, e.first_name ASC
            `,
            [companyId]
        );

        return res.json(result.rows);

    } catch (error) {

        console.error(
            "Erreur liste utilisateurs :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors du chargement des utilisateurs",
        });
    }
};


// ============================================================
// UTILISATEUR PAR ID
// ============================================================

const getUserById = async (req, res) => {

    try {

        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                u.id,
                u.email,
                u.role,
                u.is_active,
                u.created_at,

                e.id AS employee_id,
                e.first_name,
                e.last_name,
                e.position,
                e.photo_url,

                r.id AS role_id,
                r.name AS role_name,
                r.slug AS role_slug

            FROM users u

            INNER JOIN employees e
                ON e.id = u.employee_id

            LEFT JOIN roles r
                ON r.slug = u.role
                AND r.company_id = u.company_id

            WHERE u.id = $1
              AND u.company_id = $2

            LIMIT 1
            `,
            [id, companyId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Utilisateur introuvable",
            });
        }

        return res.json(result.rows[0]);

    } catch (error) {

        console.error(
            "Erreur utilisateur :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors du chargement de l'utilisateur",
        });
    }
};



// ============================================================
// EMPLOYES DISPONIBLES (SANS COMPTE UTILISATEUR)
// ============================================================

const getAvailableEmployees = async (req, res) => {
    try {

        const result = await pool.query(
            `
            SELECT
                e.id,
                e.first_name,
                e.last_name,
                e.position,
                e.photo_url,
                e.matricule,
                e.email,
                e.phone,
                e.service_id
            FROM employees e

            LEFT JOIN users u
                ON u.employee_id = e.id

            WHERE e.company_id = $1
              AND u.id IS NULL
              AND e.status = 'actif'

            ORDER BY
                e.last_name ASC,
                e.first_name ASC
            `,
            [req.user.companyId]
        );

        return res.json(result.rows);

    } catch (error) {

        console.error(
            "Erreur employés disponibles :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors du chargement des employés",
        });
    }
};



// ============================================================
// CREER UN UTILISATEUR
// ============================================================

const createUser = async (req, res) => {

    const client = await pool.connect();

    try {

        const companyId = req.user.companyId;

        const {
            employee_id,
            email,
            password,
            role,
        } = req.body;


        if (
            !employee_id ||
            !email ||
            !password ||
            !role
        ) {

            return res.status(400).json({
                message:
                    "Employé, email, mot de passe et rôle sont obligatoires",
            });
        }


        if (password.length < 6) {

            return res.status(400).json({
                message:
                    "Le mot de passe doit contenir au moins 6 caractères",
            });
        }


        // Vérifier que l'employé appartient à l'entreprise

        const employeeResult =
            await client.query(
                `
                SELECT id
                FROM employees
                WHERE id = $1
                  AND company_id = $2
                LIMIT 1
                `,
                [
                    employee_id,
                    companyId,
                ]
            );


        if (employeeResult.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Employé introuvable",
            });
        }


        // Vérifier si l'employé possède déjà un compte

        const existingEmployee =
            await client.query(
                `
                SELECT id
                FROM users
                WHERE employee_id = $1
                LIMIT 1
                `,
                [employee_id]
            );


        if (existingEmployee.rows.length > 0) {

            return res.status(409).json({
                message:
                    "Cet employé possède déjà un compte utilisateur",
            });
        }


        // Vérifier email

        const existingEmail =
            await client.query(
                `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,
                [email]
            );


        if (existingEmail.rows.length > 0) {

            return res.status(409).json({
                message:
                    "Cette adresse email est déjà utilisée",
            });
        }


        // Vérifier rôle

        const roleResult =
            await client.query(
                `
                SELECT slug
                FROM roles
                WHERE slug = $1
                  AND company_id = $2
                LIMIT 1
                `,
                [
                    role,
                    companyId,
                ]
            );


        if (roleResult.rows.length === 0) {

            return res.status(400).json({
                message:
                    "Rôle invalide",
            });
        }


        const passwordHash =
            await bcrypt.hash(
                password,
                10
            );


        const result =
            await client.query(
                `
                INSERT INTO users (
                    company_id,
                    employee_id,
                    email,
                    password_hash,
                    role,
                    is_active
                )
                VALUES (
                    $1,
                    $2,
                    LOWER($3),
                    $4,
                    $5,
                    true
                )
                RETURNING
                    id,
                    email,
                    role,
                    is_active,
                    created_at
                `,
                [
                    companyId,
                    employee_id,
                    email,
                    passwordHash,
                    role,
                ]
            );


        return res.status(201).json({
            message:
                "Utilisateur créé avec succès",

            user:
                result.rows[0],
        });


    } catch (error) {

        console.error(
            "Erreur création utilisateur :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la création de l'utilisateur",
        });

    } finally {

        client.release();
    }
};


// ============================================================
// MODIFIER UN UTILISATEUR
// ============================================================

const updateUser = async (req, res) => {

    try {

        const companyId = req.user.companyId;
        const { id } = req.params;

        const {
            email,
            role,
        } = req.body;


        if (!email || !role) {

            return res.status(400).json({
                message:
                    "Email et rôle sont obligatoires",
            });
        }


        const roleResult =
            await pool.query(
                `
                SELECT slug
                FROM roles
                WHERE slug = $1
                  AND company_id = $2
                LIMIT 1
                `,
                [
                    role,
                    companyId,
                ]
            );


        if (roleResult.rows.length === 0) {

            return res.status(400).json({
                message:
                    "Rôle invalide",
            });
        }


        const result =
            await pool.query(
                `
                UPDATE users

                SET
                    email = LOWER($1),
                    role = $2

                WHERE id = $3
                  AND company_id = $4

                RETURNING
                    id,
                    email,
                    role,
                    is_active
                `,
                [
                    email,
                    role,
                    id,
                    companyId,
                ]
            );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Utilisateur introuvable",
            });
        }


        return res.json({
            message:
                "Utilisateur modifié avec succès",

            user:
                result.rows[0],
        });


    } catch (error) {

        console.error(
            "Erreur modification utilisateur :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la modification",
        });
    }
};


// ============================================================
// ACTIVER / DESACTIVER
// ============================================================

const toggleUserStatus = async (req, res) => {

    try {

        const { id } = req.params;


        // Empêcher de désactiver son propre compte
        // (String() évite un faux négatif si userId est un nombre)

        if (String(id) === String(req.user.userId)) {

            return res.status(400).json({
                message:
                    "Vous ne pouvez pas désactiver votre propre compte",
            });
        }


        // La condition company_id empêche toute action
        // sur un utilisateur d'une autre entreprise

        const result =
            await pool.query(
                `
                UPDATE users

                SET
                    is_active = NOT is_active,
                    updated_at = NOW()

                WHERE id = $1
                  AND company_id = $2

                RETURNING
                    id,
                    email,
                    role,
                    is_active
                `,
                [
                    id,
                    req.user.companyId,
                ]
            );


        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Utilisateur introuvable",
            });
        }


        return res.json({
            message:
                result.rows[0].is_active
                    ? "Utilisateur activé"
                    : "Utilisateur désactivé",

            user:
                result.rows[0],
        });


    } catch (error) {

        console.error(
            "Erreur changement statut utilisateur :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la modification du statut",
        });
    }
};


// ============================================================
// SUPPRIMER
// ============================================================

const deleteUser = async (req, res) => {

    try {

        const { id } = req.params;


        // Empêcher de supprimer son propre compte

        if (String(id) === String(req.user.userId)) {

            return res.status(400).json({
                message:
                    "Vous ne pouvez pas supprimer votre propre compte",
            });
        }


        // La condition company_id empêche toute suppression
        // d'un utilisateur d'une autre entreprise

        const result =
            await pool.query(
                `
                DELETE FROM users

                WHERE id = $1
                  AND company_id = $2

                RETURNING id
                `,
                [
                    id,
                    req.user.companyId,
                ]
            );


        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Utilisateur introuvable",
            });
        }


        return res.json({
            message:
                "Utilisateur supprimé avec succès",
        });


    } catch (error) {

        console.error(
            "Erreur suppression utilisateur :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la suppression",
        });
    }
};


module.exports = {
    getUserStats,
    getUsers,
    getUserById,
    getAvailableEmployees,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
};