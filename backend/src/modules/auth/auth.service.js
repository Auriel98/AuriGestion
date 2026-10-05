const pool =
    require("../../config/db");

const {
    comparePassword,
} = require("../../utils/password");

const {
    generateToken,
} = require("../../utils/jwt");


const login = async (
    email,
    password
) => {

    const result =
        await pool.query(
            `
            SELECT

                u.id,
                u.company_id,
                u.employee_id,
                u.email,
                u.password_hash,
                u.role,
                u.is_active,

                e.first_name,
                e.last_name,
                e.photo_url,
                e.position,

                c.name AS company_name,
                c.logo_url AS company_logo

            FROM users u

            INNER JOIN employees e
                ON e.id = u.employee_id

            INNER JOIN companies c
                ON c.id = u.company_id

            WHERE LOWER(u.email)
                = LOWER($1)

            LIMIT 1
            `,
            [email]
        );


    if (result.rows.length === 0) {

        throw new Error(
            "EMAIL_OR_PASSWORD_INVALID"
        );

    }


    const user =
        result.rows[0];


    if (!user.is_active) {

        throw new Error(
            "USER_DISABLED"
        );

    }


    const validPassword =
        await comparePassword(
            password,
            user.password_hash
        );


    if (!validPassword) {

        throw new Error(
            "EMAIL_OR_PASSWORD_INVALID"
        );

    }


    await pool.query(
        `
        UPDATE users

        SET last_login_at =
            CURRENT_TIMESTAMP

        WHERE id = $1
        `,
        [user.id]
    );


    const token =
        generateToken(user);


    delete user.password_hash;


    return {
        token,
        user,
    };
};


module.exports = {
    login,
};