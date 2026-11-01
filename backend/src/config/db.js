const { Pool } = require("pg");
const { AsyncLocalStorage } = require("async_hooks");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on("error", (error) => {
    console.error(
        "Erreur PostgreSQL :",
        error
    );
});

/* =====================================================
   Traçabilité : transmission de l'utilisateur à PostgreSQL
   ===================================================== */

const userContext = new AsyncLocalStorage();

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WRITE_REGEX = /^\s*(INSERT|UPDATE|DELETE|WITH)\b/i;
const TX_START_REGEX = /^\s*(BEGIN|START\s+TRANSACTION)\b/i;
const TX_END_REGEX = /^\s*(COMMIT|ROLLBACK|END)\b/i;

const SET_USER_SQL = "SELECT set_config('app.user_id', $1, true)";

const getCurrentUserId = () => {
    const store = userContext.getStore();

    if (store && UUID_REGEX.test(store.userId || "")) {
        return store.userId;
    }

    return null;
};

const getQueryText = (args) =>
    typeof args[0] === "string" ? args[0] : args[0]?.text || "";

const hasCallback = (args) =>
    typeof args[args.length - 1] === "function";

const originalPoolQuery = pool.query.bind(pool);
const originalPoolConnect = pool.connect.bind(pool);

// Client utilisé pour les transactions : on suit BEGIN / COMMIT / ROLLBACK
const patchClient = (client) => {
    if (client.__audited) {
        return client;
    }

    client.__audited = true;
    client.__inTransaction = false;

    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    client.query = async (...args) => {
        if (hasCallback(args)) {
            return originalQuery(...args);
        }

        const text = getQueryText(args);
        const userId = getCurrentUserId();

        if (TX_START_REGEX.test(text)) {
            const result = await originalQuery(...args);

            client.__inTransaction = true;

            if (userId) {
                await originalQuery(SET_USER_SQL, [userId]);
            }

            return result;
        }

        if (TX_END_REGEX.test(text)) {
            try {
                return await originalQuery(...args);
            } finally {
                client.__inTransaction = false;
            }
        }

        // Écriture hors transaction explicite
        if (userId && !client.__inTransaction && WRITE_REGEX.test(text)) {
            try {
                await originalQuery("BEGIN");
                await originalQuery(SET_USER_SQL, [userId]);

                const result = await originalQuery(...args);

                await originalQuery("COMMIT");

                return result;
            } catch (error) {
                try {
                    await originalQuery("ROLLBACK");
                } catch (rollbackError) {
                    // la connexion est peut-être déjà fermée
                }

                throw error;
            }
        }

        return originalQuery(...args);
    };

    client.release = (...args) => {
        client.__inTransaction = false;
        return originalRelease(...args);
    };

    return client;
};

pool.connect = async (...args) => {
    if (hasCallback(args)) {
        return originalPoolConnect(...args);
    }

    const client = await originalPoolConnect();

    return patchClient(client);
};

// pool.query : seules les écritures d'un utilisateur connecté sont enveloppées
pool.query = async (...args) => {
    const userId = getCurrentUserId();

    if (
        !userId ||
        hasCallback(args) ||
        !WRITE_REGEX.test(getQueryText(args))
    ) {
        return originalPoolQuery(...args);
    }

    const client = await originalPoolConnect();

    try {
        await client.query("BEGIN");
        await client.query(SET_USER_SQL, [userId]);

        const result = await client.query(...args);

        await client.query("COMMIT");

        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            // la connexion est peut-être déjà fermée
        }

        throw error;
    } finally {
        client.release();
    }
};

// Utilisé par le middleware d'authentification
pool.runWithUser = (userId, callback) =>
    userContext.run({ userId }, callback);

module.exports = pool;