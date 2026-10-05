const pool = require("../config/db");

const requirePermission = (module, action) => {

    return async (req, res, next) => {

        try {

            if (!req.user || !req.user.userId) {

                return res.status(401).json({
                    message: "Authentification requise",
                });

            }

            /*
             * Le directeur conserve un accès complet.
             */
            if (req.user.role === "directeur") {
                return next();
            }

            const result = await pool.query(
                `
                SELECT 1

                FROM users u

                INNER JOIN roles r
                    ON r.company_id = u.company_id
                   AND r.slug = u.role

                INNER JOIN role_permissions rp
                    ON rp.role_id = r.id

                INNER JOIN permissions p
                    ON p.id = rp.permission_id

                WHERE u.id = $1
                  AND u.company_id = $2
                  AND u.is_active = TRUE
                  AND p.module = $3
                  AND p.action = $4

                LIMIT 1
                `,
                [
                    req.user.userId,
                    req.user.companyId,
                    module,
                    action,
                ]
            );

            if (result.rowCount === 0) {

                return res.status(403).json({
                    message:
                        "Vous n'avez pas la permission d'effectuer cette action.",
                });

            }

            next();

        } catch (error) {

            console.error(
                "Erreur vérification permission :",
                error
            );

            return res.status(500).json({
                message:
                    "Erreur lors de la vérification des permissions.",
            });
        }
    };
};

module.exports = requirePermission;