const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");
const { uploadRoot } = require("../../middlewares/upload.middleware");


// =====================================================
// UTILITAIRES PHOTO
// =====================================================

// URL publique stockée en base
const buildPhotoUrl = (file) =>
    file ? `/uploads/employee-photos/${file.filename}` : null;

// Supprime un fichier à partir de son URL publique (/uploads/...)
const deletePhotoFile = (photoUrl) => {
    if (!photoUrl) return;

    const relative = photoUrl.replace(/^\/uploads\//, "");
    const filePath = path.join(uploadRoot, relative);

    // Sécurité : le fichier doit rester dans le dossier uploads
    if (!filePath.startsWith(uploadRoot)) return;

    fs.unlink(filePath, () => {});
};

// Supprime le fichier fraîchement uploadé en cas d'erreur
const cleanupUploadedFile = (file) => {
    if (file && file.path) {
        fs.unlink(file.path, () => {});
    }
};


// =====================================================
// STATISTIQUES
// =====================================================

const getEmployeeStats = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const result = await pool.query(
            `
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'actif') AS active,
                COUNT(*) FILTER (WHERE status != 'actif') AS inactive,
                COUNT(*) FILTER (
                    WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days'
                ) AS recent
            FROM employees
            WHERE company_id = $1
            `,
            [companyId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erreur statistiques employés :", error);
        res.status(500).json({
            message: "Erreur lors du chargement des statistiques",
        });
    }
};


// =====================================================
// LISTE DES EMPLOYÉS
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
                e.email,
                e.phone,
                e.position,
                e.hire_date,
                e.photo_url,
                e.status,
                e.service_id,
                s.name AS service_name,
                e.created_at,
                (u.id IS NOT NULL) AS has_user
            FROM employees e
            LEFT JOIN services s ON s.id = e.service_id
            LEFT JOIN users u ON u.employee_id = e.id
            WHERE e.company_id = $1
            ORDER BY e.last_name ASC, e.first_name ASC
            `,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Erreur récupération employés :", error);
        res.status(500).json({
            message: "Erreur lors du chargement des employés",
        });
    }
};


// =====================================================
// UN EMPLOYÉ
// =====================================================

const getEmployeeById = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                e.id,
                e.matricule,
                e.first_name,
                e.last_name,
                e.email,
                e.phone,
                e.birth_date,
                e.birth_place,
                e.nationality,
                e.marital_status,
                e.children_count,
                e.cnss_number,
                e.position,
                e.hire_date,
                e.photo_url,
                e.status,
                e.service_id,
                s.name AS service_name,
                e.created_at,
                e.updated_at,
                (u.id IS NOT NULL) AS has_user
            FROM employees e
            LEFT JOIN services s ON s.id = e.service_id
            LEFT JOIN users u ON u.employee_id = e.id
            WHERE e.id = $1
              AND e.company_id = $2
            `,
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Employé introuvable" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erreur récupération employé :", error);
        res.status(500).json({
            message: "Erreur lors du chargement de l'employé",
        });
    }
};


// =====================================================
// CRÉER UN EMPLOYÉ (photo optionnelle)
// =====================================================

const createEmployee = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const {
            matricule,
            first_name,
            last_name,
            email,
            phone,
            birth_date,
            birth_place,
            nationality,
            marital_status,
            children_count,
            cnss_number,
            position,
            hire_date,
            service_id,
        } = req.body;

        if (!matricule || !first_name || !last_name) {
            cleanupUploadedFile(req.file);
            return res.status(400).json({
                message: "Le matricule, le prénom et le nom sont obligatoires",
            });
        }

        const photoUrl = buildPhotoUrl(req.file);

        const result = await pool.query(
            `
            INSERT INTO employees (
                company_id,
                service_id,
                matricule,
                first_name,
                last_name,
                email,
                phone,
                birth_date,
                birth_place,
                nationality,
                marital_status,
                children_count,
                cnss_number,
                position,
                hire_date,
                photo_url,
                status
            )
            VALUES (
                $1, $2, $3,
                $4, $5,
                $6, $7,
                $8, $9,
                $10, $11, $12,
                $13,
                $14, $15,
                $16,
                'actif'
            )
            RETURNING *
            `,
            [
                companyId,
                service_id || null,
                matricule,
                first_name,
                last_name,
                email || null,
                phone || null,
                birth_date || null,
                birth_place || null,
                nationality || "Gabonaise",
                marital_status || null,
                parseInt(children_count, 10) || 0,
                cnss_number || null,
                position || null,
                hire_date || null,
                photoUrl,
            ]
        );

        res.status(201).json({
            message: "Employé créé avec succès",
            employee: result.rows[0],
        });
    } catch (error) {
        cleanupUploadedFile(req.file);

        console.error("Erreur création employé :", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Ce matricule existe déjà dans cette entreprise",
            });
        }

        res.status(500).json({
            message: "Erreur lors de la création de l'employé",
        });
    }
};


// =====================================================
// MODIFIER UN EMPLOYÉ (photo optionnelle)
// =====================================================

const updateEmployee = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const {
            matricule,
            first_name,
            last_name,
            email,
            phone,
            birth_date,
            birth_place,
            nationality,
            marital_status,
            children_count,
            cnss_number,
            position,
            hire_date,
            service_id,
        } = req.body;

        if (!matricule || !first_name || !last_name) {
            cleanupUploadedFile(req.file);
            return res.status(400).json({
                message: "Le matricule, le prénom et le nom sont obligatoires",
            });
        }

        // Ancienne photo (+ vérification d'appartenance à l'entreprise)
        const existing = await pool.query(
            `SELECT photo_url FROM employees WHERE id = $1 AND company_id = $2`,
            [id, companyId]
        );

        if (existing.rows.length === 0) {
            cleanupUploadedFile(req.file);
            return res.status(404).json({ message: "Employé introuvable" });
        }

        const oldPhotoUrl = existing.rows[0].photo_url;
        const newPhotoUrl = buildPhotoUrl(req.file); // null si pas de nouvelle photo

        const result = await pool.query(
            `
            UPDATE employees
            SET
                matricule = $1,
                first_name = $2,
                last_name = $3,
                email = $4,
                phone = $5,
                birth_date = $6,
                birth_place = $7,
                nationality = $8,
                marital_status = $9,
                children_count = $10,
                cnss_number = $11,
                position = $12,
                hire_date = $13,
                service_id = $14,
                photo_url = COALESCE($15, photo_url),
                updated_at = NOW()
            WHERE id = $16
              AND company_id = $17
            RETURNING *
            `,
            [
                matricule,
                first_name,
                last_name,
                email || null,
                phone || null,
                birth_date || null,
                birth_place || null,
                nationality || "Gabonaise",
                marital_status || null,
                parseInt(children_count, 10) || 0,
                cnss_number || null,
                position || null,
                hire_date || null,
                service_id || null,
                newPhotoUrl,
                id,
                companyId,
            ]
        );

        // Nouvelle photo enregistrée → on supprime l'ancienne du disque
        if (newPhotoUrl && oldPhotoUrl) {
            deletePhotoFile(oldPhotoUrl);
        }

        res.json({
            message: "Employé modifié avec succès",
            employee: result.rows[0],
        });
    } catch (error) {
        cleanupUploadedFile(req.file);

        console.error("Erreur modification employé :", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Ce matricule existe déjà dans cette entreprise",
            });
        }

        res.status(500).json({
            message: "Erreur lors de la modification de l'employé",
        });
    }
};


// =====================================================
// SUPPRIMER LA PHOTO
// =====================================================

const deleteEmployeePhoto = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const existing = await pool.query(
            `SELECT photo_url FROM employees WHERE id = $1 AND company_id = $2`,
            [id, companyId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ message: "Employé introuvable" });
        }

        await pool.query(
            `
            UPDATE employees
            SET photo_url = NULL, updated_at = NOW()
            WHERE id = $1 AND company_id = $2
            `,
            [id, companyId]
        );

        deletePhotoFile(existing.rows[0].photo_url);

        res.json({ message: "Photo supprimée avec succès" });
    } catch (error) {
        console.error("Erreur suppression photo employé :", error);
        res.status(500).json({
            message: "Erreur lors de la suppression de la photo",
        });
    }
};


// =====================================================
// ACTIVER / DÉSACTIVER
// =====================================================

const toggleEmployeeStatus = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            UPDATE employees
            SET
                status = CASE
                    WHEN status = 'actif' THEN 'inactif'
                    ELSE 'actif'
                END,
                updated_at = NOW()
            WHERE id = $1
              AND company_id = $2
            RETURNING id, status
            `,
            [id, companyId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Employé introuvable" });
        }

        res.json({
            message: "Statut de l'employé mis à jour",
            status: result.rows[0].status,
        });
    } catch (error) {
        console.error("Erreur changement statut employé :", error);
        res.status(500).json({
            message: "Erreur lors de la modification du statut",
        });
    }
};


// =====================================================
// SUPPRIMER UN EMPLOYÉ
// =====================================================

const deleteEmployee = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const result = await pool.query(
            `
            DELETE FROM employees
            WHERE id = $1
              AND company_id = $2
            RETURNING id, photo_url
            `,
            [id, companyId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Employé introuvable" });
        }

        // Nettoyer la photo du disque
        deletePhotoFile(result.rows[0].photo_url);

        res.json({ message: "Employé supprimé avec succès" });
    } catch (error) {
        console.error("Erreur suppression employé :", error);

        if (error.code === "23503") {
            return res.status(409).json({
                message:
                    "Impossible de supprimer cet employé car il possède des données associées",
            });
        }

        res.status(500).json({
            message: "Erreur lors de la suppression de l'employé",
        });
    }
};


module.exports = {
    getEmployeeStats,
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployeePhoto,
    toggleEmployeeStatus,
    deleteEmployee,
};