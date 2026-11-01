
const pool = require("../../config/db");

// =====================================================
// STATISTIQUES
// =====================================================

const getClientStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                COUNT(*) AS total,

                COUNT(*) FILTER (
                    WHERE status = 'active'
                ) AS active,

                COUNT(*) FILTER (
                    WHERE status != 'active'
                ) AS inactive,

                COUNT(*) FILTER (
                    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                ) AS recent

            FROM clients

            WHERE company_id = $1
            `,
            [companyId]
        );

        res.json(result.rows[0]);

    } catch (error) {
        console.error(
            "Erreur statistiques clients :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement des statistiques",
        });
    }
};


// =====================================================
// LISTE DES CLIENTS
// =====================================================

const getClients = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                c.id,
                c.client_type,

                c.name,
                c.contact_name,

                c.email,
                c.phone,

                c.address,
                c.city,
                c.country,

                c.nif,
                c.rccm,

                c.notes,
                c.status,

                c.created_at,
                c.updated_at

            FROM clients c

            WHERE c.company_id = $1

            ORDER BY
                c.name ASC
            `,
            [companyId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(
            "Erreur récupération clients :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement des clients",
        });
    }
};


// =====================================================
// UN CLIENT
// =====================================================

const getClientById = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                c.id,
                c.client_type,

                c.name,
                c.contact_name,

                c.email,
                c.phone,

                c.address,
                c.city,
                c.country,

                c.nif,
                c.rccm,

                c.notes,
                c.status,

                c.created_at,
                c.updated_at

            FROM clients c

            WHERE c.id = $1
              AND c.company_id = $2
            `,
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Client introuvable",
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(
            "Erreur récupération client :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors du chargement du client",
        });
    }
};


// =====================================================
// CRÉER UN CLIENT
// =====================================================

const createClient = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const {
            client_type,
            name,
            contact_name,
            email,
            phone,
            address,
            city,
            country,
            nif,
            rccm,
            notes,
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!name || !name.trim()) {
            return res.status(400).json({
                message:
                    "Le nom du client est obligatoire",
            });
        }


        // -------------------------------------------------
        // CRÉATION
        // -------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO clients (
                company_id,
                client_type,
                name,
                contact_name,
                email,
                phone,
                address,
                city,
                country,
                nif,
                rccm,
                notes,
                status
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
                $11,
                $12,
                'active'
            )

            RETURNING *
            `,
            [
                companyId,

                client_type || "entreprise",

                name.trim(),

                contact_name || null,

                email || null,

                phone || null,

                address || null,

                city || null,

                country || "Gabon",

                nif || null,

                rccm || null,

                notes || null,
            ]
        );


        res.status(201).json({
            message:
                "Client créé avec succès",

            client:
                result.rows[0],
        });

    } catch (error) {
        console.error(
            "Erreur création client :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la création du client",
        });
    }
};


// =====================================================
// MODIFIER UN CLIENT
// =====================================================

const updateClient = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const {
            client_type,
            name,
            contact_name,
            email,
            phone,
            address,
            city,
            country,
            nif,
            rccm,
            notes,
        } = req.body;


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!name || !name.trim()) {
            return res.status(400).json({
                message:
                    "Le nom du client est obligatoire",
            });
        }


        // -------------------------------------------------
        // MODIFICATION
        // -------------------------------------------------

        const result = await pool.query(
            `
            UPDATE clients

            SET
                client_type = $1,

                name = $2,
                contact_name = $3,

                email = $4,
                phone = $5,

                address = $6,
                city = $7,
                country = $8,

                nif = $9,
                rccm = $10,

                notes = $11,

                updated_at = NOW()

            WHERE id = $12
              AND company_id = $13

            RETURNING *
            `,
            [
                client_type || "entreprise",

                name.trim(),

                contact_name || null,

                email || null,

                phone || null,

                address || null,

                city || null,

                country || "Gabon",

                nif || null,

                rccm || null,

                notes || null,

                id,

                companyId,
            ]
        );


        // -------------------------------------------------
        // CLIENT INTROUVABLE
        // -------------------------------------------------

        if (result.rowCount === 0) {
            return res.status(404).json({
                message:
                    "Client introuvable",
            });
        }


        res.json({
            message:
                "Client modifié avec succès",

            client:
                result.rows[0],
        });

    } catch (error) {
        console.error(
            "Erreur modification client :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la modification du client",
        });
    }
};


// =====================================================
// ACTIVER / DÉSACTIVER
// =====================================================

const toggleClientStatus = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            UPDATE clients

            SET
                status =
                    CASE
                        WHEN status = 'active'
                        THEN 'inactive'
                        ELSE 'active'
                    END,

                updated_at = NOW()

            WHERE id = $1
              AND company_id = $2

            RETURNING id, status
            `,
            [id, companyId]
        );


        // -------------------------------------------------
        // CLIENT INTROUVABLE
        // -------------------------------------------------

        if (result.rowCount === 0) {
            return res.status(404).json({
                message:
                    "Client introuvable",
            });
        }


        res.json({
            message:
                "Statut du client mis à jour",

            status:
                result.rows[0].status,
        });

    } catch (error) {
        console.error(
            "Erreur changement statut client :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la modification du statut",
        });
    }
};


// =====================================================
// SUPPRIMER
// =====================================================

const deleteClient = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;


        const result = await pool.query(
            `
            DELETE FROM clients

            WHERE id = $1
              AND company_id = $2

            RETURNING id
            `,
            [id, companyId]
        );


        // -------------------------------------------------
        // CLIENT INTROUVABLE
        // -------------------------------------------------

        if (result.rowCount === 0) {
            return res.status(404).json({
                message:
                    "Client introuvable",
            });
        }


        res.json({
            message:
                "Client supprimé avec succès",
        });

    } catch (error) {
        console.error(
            "Erreur suppression client :",
            error
        );


        // -------------------------------------------------
        // CONTRAINTE DE CLÉ ÉTRANGÈRE
        // -------------------------------------------------

        if (error.code === "23503") {
            return res.status(409).json({
                message:
                    "Impossible de supprimer ce client car il possède des données associées",
            });
        }


        res.status(500).json({
            message:
                "Erreur lors de la suppression du client",
        });
    }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    getClientStats,
    getClients,
    getClientById,
    createClient,
    updateClient,
    toggleClientStatus,
    deleteClient,
};
