// Rôles autorisés à consulter le journal d'audit.
// Pour ouvrir l'accès à un autre rôle (ex : RH), ajoute son nom ici.
const AUDIT_ALLOWED_ROLES = ["directeur"];

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const role = String(req.user?.role || "").toLowerCase();

        const allowed = allowedRoles.map((item) =>
            String(item).toLowerCase()
        );

        if (!allowed.includes(role)) {
            return res.status(403).json({
                success: false,
                message: "Vous n'avez pas la permission d'accéder à cette ressource.",
            });
        }

        return next();
    };
};

module.exports = {
    authorizeRoles,
    AUDIT_ALLOWED_ROLES,
};