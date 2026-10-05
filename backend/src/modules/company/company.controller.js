const fs = require("fs");

const companyService = require("./company.service");

// Rôles autorisés à modifier l'entreprise (comparaison sans casse)
const ADMIN_ROLES = ["admin", "super_admin", "rh", "directeur"];


const handleError = (res, error, fallback) => {

    const map = {
        USER_NOT_FOUND: [404, "Utilisateur introuvable"],
        COMPANY_NOT_FOUND: [404, "Entreprise introuvable"],
        NAME_REQUIRED: [400, "Le nom de l'entreprise est obligatoire"],
        NOTHING_TO_UPDATE: [400, "Aucune donnée à modifier"],
        FORBIDDEN: [403, "Action réservée aux administrateurs"],
    };

    const known = map[error.message];

    if (known) {
        return res.status(known[0]).json({ message: known[1] });
    }

    console.error(fallback, error);

    return res.status(500).json({ message: fallback });
};


const assertAdmin = async (userId) => {

    const { role } = await companyService.getUserContext(userId);

    if (!ADMIN_ROLES.includes(String(role).toLowerCase())) {
        throw new Error("FORBIDDEN");
    }
};


const getCompany = async (req, res) => {

    try {
        const company = await companyService.getCompany(req.user.userId);
        return res.json(company);
    } catch (error) {
        return handleError(
            res,
            error,
            "Erreur lors de la récupération de l'entreprise"
        );
    }
};


const updateCompany = async (req, res) => {

    try {
        await assertAdmin(req.user.userId);

        const company = await companyService.updateCompany(
            req.user.userId,
            req.body
        );

        return res.json({
            message: "Paramètres de l'entreprise mis à jour",
            company,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Erreur lors de la mise à jour de l'entreprise"
        );
    }
};


const updateLogo = async (req, res) => {

    try {
        // Le fichier est déjà sur disque : on le supprime si l'accès est refusé
        try {
            await assertAdmin(req.user.userId);
        } catch (error) {
            if (req.file) fs.unlink(req.file.path, () => {});
            throw error;
        }

        if (!req.file) {
            return res.status(400).json({ message: "Aucun logo reçu" });
        }

        const result = await companyService.updateLogo(
            req.user.userId,
            req.file.filename
        );

        return res.json({
            message: "Logo mis à jour",
            logo_url: result.logo_url,
        });
    } catch (error) {
        return handleError(res, error, "Erreur lors de la mise à jour du logo");
    }
};


const deleteLogo = async (req, res) => {

    try {
        await assertAdmin(req.user.userId);

        await companyService.deleteLogo(req.user.userId);

        return res.json({ message: "Logo supprimé" });
    } catch (error) {
        return handleError(res, error, "Erreur lors de la suppression du logo");
    }
};


module.exports = {
    getCompany,
    updateCompany,
    updateLogo,
    deleteLogo,
};