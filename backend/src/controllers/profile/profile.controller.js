const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("../../config/db");
const { uploadRoot } = require("../../middlewares/upload.middleware");


// =====================================================
// UTILITAIRES PHOTO
// =====================================================

const buildPhotoUrl = (file) =>
    file ? `/uploads/employee-photos/${file.filename}` : null;

const deletePhotoFile = (photoUrl) => {
    if (!photoUrl) return;

    const filePath = path.join(uploadRoot, photoUrl.replace(/^\/uploads\//, ""));

    // Sécurité : le fichier doit rester dans le dossier uploads
    if (!filePath.startsWith(uploadRoot)) return;

    fs.unlink(filePath, () => {});
};

const cleanupUploadedFile = (file) => {
    if (file && file.path) fs.unlink(file.path, () => {});
};


// =====================================================
// MON PROFIL (lecture)
// =====================================================

const getMyProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                u.id,
                u.email AS professional_email,
                u.role,
                e.id AS employee_id,
                e.matricule,
                e.first_name,
                e.last_name,
                e.email AS personal_email,
                e.phone,
                e.position,
                e.hire_date,
                e.photo_url,
                s.name AS service_name
            FROM users u
            INNER JOIN employees e ON e.id = u.employee_id
            LEFT JOIN services s ON s.id = e.service_id
            WHERE u.id = $1
              AND u.company_id = $2
            LIMIT 1
            `,
            [req.user.userId, req.user.companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Profil introuvable" });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Erreur profil :", error);
        return res.status(500).json({
            message: "Erreur lors du chargement du profil",
        });
    }
};


// =====================================================
// MODIFIER MES INFOS PERSONNELLES (email perso + téléphone)
// =====================================================

const updateMyProfile = async (req, res) => {
    try {
        const { userId, companyId } = req.user;
        const personalEmail = (req.body.personal_email || "").trim();
        const phone = (req.body.phone || "").trim();

        if (personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
            return res.status(400).json({ message: "Adresse email invalide" });
        }

        const result = await pool.query(
            `
            UPDATE employees e
            SET
                email = LOWER($1),
                phone = $2,
                updated_at = NOW()
            FROM users u
            WHERE u.id = $3
              AND u.company_id = $4
              AND e.id = u.employee_id
              AND e.company_id = $4
            RETURNING e.email AS personal_email, e.phone
            `,
            [personalEmail || null, phone || null, userId, companyId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        return res.json({
            message: "Profil mis à jour avec succès",
            profile: result.rows[0],
        });
    } catch (error) {
        console.error("Erreur modification profil :", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour du profil",
        });
    }
};


// =====================================================
// CHANGER MON MOT DE PASSE
// =====================================================

const changeMyPassword = async (req, res) => {
    try {
        const { userId, companyId } = req.user;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                message: "Le mot de passe actuel et le nouveau sont obligatoires",
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                message: "Le nouveau mot de passe doit contenir au moins 6 caractères",
            });
        }

        if (new_password === current_password) {
            return res.status(400).json({
                message: "Le nouveau mot de passe doit être différent de l'ancien",
            });
        }

        const result = await pool.query(
            `SELECT password_hash FROM users WHERE id = $1 AND company_id = $2`,
            [userId, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        const valid = await bcrypt.compare(
            current_password,
            result.rows[0].password_hash
        );

        if (!valid) {
            return res.status(400).json({ message: "Mot de passe actuel incorrect" });
        }

        const hash = await bcrypt.hash(new_password, 10);

        await pool.query(
            `
            UPDATE users
            SET password_hash = $1, updated_at = NOW()
            WHERE id = $2 AND company_id = $3
            `,
            [hash, userId, companyId]
        );

        return res.json({ message: "Mot de passe modifié avec succès" });
    } catch (error) {
        console.error("Erreur changement mot de passe :", error);
        return res.status(500).json({
            message: "Erreur lors du changement de mot de passe",
        });
    }
};


// =====================================================
// MA PHOTO (changer)
// =====================================================

const updateMyPhoto = async (req, res) => {
    try {
        const { userId, companyId } = req.user;

        if (!req.file) {
            return res.status(400).json({ message: "Aucune photo envoyée" });
        }

        const current = await pool.query(
            `
            SELECT e.id, e.photo_url
            FROM users u
            INNER JOIN employees e ON e.id = u.employee_id
            WHERE u.id = $1 AND u.company_id = $2
            `,
            [userId, companyId]
        );

        if (current.rows.length === 0) {
            cleanupUploadedFile(req.file);
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        const newUrl = buildPhotoUrl(req.file);

        await pool.query(
            `
            UPDATE employees
            SET photo_url = $1, updated_at = NOW()
            WHERE id = $2 AND company_id = $3
            `,
            [newUrl, current.rows[0].id, companyId]
        );

        // Ancienne photo supprimée du disque
        deletePhotoFile(current.rows[0].photo_url);

        return res.json({ message: "Photo mise à jour", photo_url: newUrl });
    } catch (error) {
        cleanupUploadedFile(req.file);
        console.error("Erreur photo profil :", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour de la photo",
        });
    }
};


// =====================================================
// MA PHOTO (supprimer)
// =====================================================

const deleteMyPhoto = async (req, res) => {
    try {
        const { userId, companyId } = req.user;

        const current = await pool.query(
            `
            SELECT e.id, e.photo_url
            FROM users u
            INNER JOIN employees e ON e.id = u.employee_id
            WHERE u.id = $1 AND u.company_id = $2
            `,
            [userId, companyId]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        await pool.query(
            `
            UPDATE employees
            SET photo_url = NULL, updated_at = NOW()
            WHERE id = $1 AND company_id = $2
            `,
            [current.rows[0].id, companyId]
        );

        deletePhotoFile(current.rows[0].photo_url);

        return res.json({ message: "Photo supprimée" });
    } catch (error) {
        console.error("Erreur suppression photo profil :", error);
        return res.status(500).json({
            message: "Erreur lors de la suppression de la photo",
        });
    }
};


module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    updateMyPhoto,
    deleteMyPhoto,
};
