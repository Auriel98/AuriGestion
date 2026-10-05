require("dotenv").config();

const app =
    require("./app");

const pool =
    require("./config/db");


const PORT =
    process.env.PORT || 5000;


const startServer =
    async () => {

        try {

            await pool.query(
                "SELECT NOW()"
            );

            console.log(
                "PostgreSQL connecté"
            );


            app.listen(
                PORT,
                () => {

                    console.log(
                        `API démarrée sur http://localhost:${PORT}`
                    );

                }
            );

        } catch (error) {

            console.error(
                "Impossible de démarrer :",
                error
            );

            process.exit(1);
        }
    };


startServer();