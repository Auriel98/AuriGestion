require("dotenv").config();

const readline = require("readline");

const pool = require("../config/db");
const {
    hashPassword,
} = require("../utils/password");


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


const question = (text) => {
    return new Promise((resolve) => {
        rl.question(text, resolve);
    });
};


const main = async () => {

    try {

        console.log("\n================================");
        console.log("     CREATION ADMINISTRATEUR");
        console.log("================================\n");


        const companyName =
            await question(
                "Nom de l'entreprise [EGENEM] : "
            );


        const firstName =
            await question(
                "Prénom : "
            );


        const lastName =
            await question(
                "Nom : "
            );


        const email =
            await question(
                "Email : "
            );


        const password =
            await question(
                "Mot de passe : "
            );


        if (
            !firstName ||
            !lastName ||
            !email ||
            !password
        ) {

            throw new Error(
                "Tous les champs sont obligatoires."
            );

        }


        const finalCompanyName =
            companyName.trim() ||
            "EGENEM";


        await pool.query("BEGIN");


        // ==========================================
        // ENTREPRISE
        // ==========================================

        let companyResult =
            await pool.query(
                `
                SELECT id
                FROM companies
                WHERE LOWER(name) = LOWER($1)
                LIMIT 1
                `,
                [finalCompanyName]
            );


        let companyId;


        if (companyResult.rows.length > 0) {

            companyId =
                companyResult.rows[0].id;

        } else {

            const result =
                await pool.query(
                    `
                    INSERT INTO companies (
                        name
                    )
                    VALUES ($1)
                    RETURNING id
                    `,
                    [finalCompanyName]
                );

            companyId =
                result.rows[0].id;
        }


        // ==========================================
        // SERVICE ADMINISTRATION
        // ==========================================

        let serviceResult =
            await pool.query(
                `
                SELECT id
                FROM services

                WHERE company_id = $1
                AND LOWER(name) = LOWER('Administration')

                LIMIT 1
                `,
                [companyId]
            );


        let serviceId;


        if (serviceResult.rows.length > 0) {

            serviceId =
                serviceResult.rows[0].id;

        } else {

            const result =
                await pool.query(
                    `
                    INSERT INTO services (
                        company_id,
                        name
                    )
                    VALUES (
                        $1,
                        'Administration'
                    )
                    RETURNING id
                    `,
                    [companyId]
                );

            serviceId =
                result.rows[0].id;
        }


        // ==========================================
        // MATRICULE
        // ==========================================

        const matricule =
            `ADM-${Date.now()}`;


        // ==========================================
        // EMPLOYE
        // ==========================================

        const employeeResult =
            await pool.query(
                `
                INSERT INTO employees (
                    company_id,
                    service_id,
                    matricule,
                    first_name,
                    last_name,
                    email,
                    position,
                    hire_date,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    'Directeur',
                    CURRENT_DATE,
                    'actif'
                )
                RETURNING id
                `,
                [
                    companyId,
                    serviceId,
                    matricule,
                    firstName.trim(),
                    lastName.trim(),
                    email.trim(),
                ]
            );


        const employeeId =
            employeeResult.rows[0].id;


        // ==========================================
        // MOT DE PASSE
        // ==========================================

        const passwordHash =
            await hashPassword(password);


        // ==========================================
        // USER
        // ==========================================

        await pool.query(
            `
            INSERT INTO users (
                company_id,
                employee_id,
                email,
                password_hash,
                role
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                'directeur'
            )
            `,
            [
                companyId,
                employeeId,
                email.trim(),
                passwordHash,
            ]
        );


        await pool.query("COMMIT");


        console.log("\n================================");
        console.log("     ADMINISTRATEUR CREE");
        console.log("================================");

        console.log(
            `Entreprise : ${finalCompanyName}`
        );

        console.log(
            `Utilisateur : ${firstName} ${lastName}`
        );

        console.log(
            `Email : ${email}`
        );

        console.log(
            "Rôle : directeur"
        );

        console.log(
            `Matricule : ${matricule}`
        );

        console.log("================================\n");


    } catch (error) {

        await pool.query("ROLLBACK");

        console.error(
            "\nErreur :",
            error.message
        );

    } finally {

        rl.close();

        await pool.end();
    }
};


main();