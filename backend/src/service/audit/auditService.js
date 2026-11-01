const pool = require("../../config/db");

/**
 * Récupère une page du journal d'audit avec filtres.
 */
const getAuditLogs = async (companyId, filters = {}) => {
    const {
        userId = null,
        action = null,
        tableName = null,
        dateFrom = null,
        dateTo = null,
        page = 1,
        limit = 20
    } = filters;

    const conditions = ["a.company_id = $1"];
    const params = [companyId];

    if (userId) {
        params.push(userId);
        conditions.push(`a.user_id = $${params.length}`);
    }

    if (action) {
        params.push(action);
        conditions.push(`a.action = $${params.length}`);
    }

    if (tableName) {
        params.push(tableName);
        conditions.push(`a.table_name = $${params.length}`);
    }

    if (dateFrom) {
        params.push(dateFrom);
        conditions.push(`a.created_at >= $${params.length}::date`);
    }

    if (dateTo) {
        params.push(dateTo);
        conditions.push(
            `a.created_at < ($${params.length}::date + INTERVAL '1 day')`
        );
    }

    const where = conditions.join(" AND ");

    const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM audit_logs a WHERE ${where}`,
        params
    );

    const total = Number(countResult.rows[0].total);

    const offset = (page - 1) * limit;

    const dataParams = [...params, limit, offset];

    const dataResult = await pool.query(
        `
        SELECT
            a.id,
            a.user_id,
            a.user_name,
            a.action,
            a.table_name,
            a.record_id,
            a.new_data,
            a.old_data,
            a.changed_fields,
            a.created_at
        FROM audit_logs a
        WHERE ${where}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $${dataParams.length - 1}
        OFFSET $${dataParams.length}
        `,
        dataParams
    );

    return {
        items: dataResult.rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            action: row.action,
            tableName: row.table_name,
            recordId: row.record_id,
            newData: row.new_data,
            oldData: row.old_data,
            changedFields: row.changed_fields,
            createdAt: row.created_at
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    };
};

/**
 * Valeurs disponibles pour les filtres (utilisateurs et tables).
 */
const getAuditFilters = async (companyId) => {
    const usersResult = await pool.query(
        `
        SELECT DISTINCT ON (a.user_id)
            a.user_id,
            a.user_name
        FROM audit_logs a
        WHERE a.company_id = $1
          AND a.user_id IS NOT NULL
        ORDER BY a.user_id, a.created_at DESC
        `,
        [companyId]
    );

    const tablesResult = await pool.query(
        `
        SELECT DISTINCT a.table_name
        FROM audit_logs a
        WHERE a.company_id = $1
        ORDER BY a.table_name ASC
        `,
        [companyId]
    );

    return {
        users: usersResult.rows
            .map((row) => ({
                id: row.user_id,
                name: row.user_name || "Utilisateur inconnu"
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "fr")),
        tables: tablesResult.rows.map((row) => row.table_name)
    };
};

module.exports = {
    getAuditLogs,
    getAuditFilters
};