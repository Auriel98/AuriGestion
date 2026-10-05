const authService =
    require("./auth.service");

const pool =
    require("../../config/db");


const login = async (
    req,
    res
) => {

    try {

        const {
            email,
            password,
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({
                message:
                    "Email et mot de passe obligatoires",
            });

        }


        const result =
            await authService.login(
                email,
                password
            );


        return res.json(result);


    } catch (error) {

        if (
            error.message ===
            "USER_DISABLED"
        ) {

            return res.status(403).json({
                message:
                    "Votre compte est désactivé",
            });

        }


        return res.status(401).json({
            message:
                "Email ou mot de passe incorrect",
        });
    }
};


const me = async (
    req,
    res
) => {

    const result =
        await pool.query(
            `
            SELECT

                u.id,
                u.email,
                u.role,

                e.id AS employee_id,
                e.first_name,
                e.last_name,
                e.photo_url,
                e.position,

                c.id AS company_id,
                c.name AS company_name,
                c.logo_url AS company_logo

            FROM users u

            INNER JOIN employees e
                ON e.id = u.employee_id

            INNER JOIN companies c
                ON c.id = u.company_id

            WHERE u.id = $1
            `,
            [req.user.userId]
        );


    if (result.rows.length === 0) {

        return res.status(404).json({
            message:
                "Utilisateur introuvable",
        });

    }


    res.json(result.rows[0]);
};


const updateProfilePhoto = async (
    req,
    res
) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                message:
                    "Aucune photo reçue",
            });

        }


        const photoUrl =
            `/uploads/profiles/${req.file.filename}`;


        const result =
            await pool.query(
                `
                UPDATE employees e

                SET photo_url = $1,
                    updated_at = NOW()

                FROM users u

                WHERE u.employee_id = e.id
                  AND u.id = $2

                RETURNING e.id, e.photo_url
                `,
                [
                    photoUrl,
                    req.user.userId,
                ]
            );


        if (result.rowCount === 0) {

            return res.status(404).json({
                message:
                    "Employé introuvable",
            });

        }


        return res.json({
            message:
                "Photo mise à jour",
            photo_url:
                result.rows[0].photo_url,
        });


    } catch (error) {

        console.error(
            "Erreur upload photo :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la mise à jour de la photo",
        });
    }
};


module.exports = {
    login,
    me,
    updateProfilePhoto,
};