const fs = require("fs");
const path = require("path");

const pool = require("../../config/db");

const uploadRoot = path.resolve(
    __dirname,
    "../../../uploads"
);

// Champs modifiables (liste blanche)
const UPDATABLE_FIELDS = [
    "name",
    "legal_name",
    "nif",
    "rccm",
    "cnss",
    "phone",
    "email",
    "address",
];


/* Récupère l'entreprise et le rôle de l'utilisateur connecté */
const getUserContext = async (userId) => {

    const result = await pool.query(
        `
        SELECT company_id, role
        FROM users
        WHERE id = $1
          AND is_active = TRUE
        `,
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error("USER_NOT_FOUND");
    }

    return result.rows[0];
};


/* Supprime un ancien fichier logo, sans jamais sortir du dossier uploads */
const removeLogoFile = (logoUrl) => {

    if (!logoUrl) return;

    const relative = logoUrl.replace(/^\/uploads\//, "");
    const filePath = path.resolve(uploadRoot, relative);

    if (!filePath.startsWith(uploadRoot + path.sep)) return;

    fs.unlink(filePath, () => {});
};


const getCompany = async (userId) => {

    const { company_id } = await getUserContext(userId);

    const result = await pool.query(
        `
        SELECT
            id, name, legal_name, nif, rccm, cnss,
            phone, email, address, logo_url,
            created_at, updated_at
        FROM companies
        WHERE id = $1
        `,
        [company_id]
    );

    if (result.rows.length === 0) {
        throw new Error("COMPANY_NOT_FOUND");
    }

    return result.rows[0];
};


const updateCompany = async (userId, data) => {

    const { company_id } = await getUserContext(userId);

    const fields = [];
    const values = [];

    for (const key of UPDATABLE_FIELDS) {

        if (data[key] === undefined) continue;

        let value = data[key];

        if (typeof value === "string") {
            value = value.trim();
        }

        if (key === "name" && !value) {
            throw new Error("NAME_REQUIRED");
        }

        values.push(value === "" ? null : value);
        fields.push(`${key} = $${values.length}`);
    }

    if (fields.length === 0) {
        throw new Error("NOTHING_TO_UPDATE");
    }

    values.push(company_id);

    const result = await pool.query(
        `
        UPDATE companies
        SET ${fields.join(", ")},
            updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING
            id, name, legal_name, nif, rccm, cnss,
            phone, email, address, logo_url, updated_at
        `,
        values
    );

    return result.rows[0];
};


const updateLogo = async (userId, filename) => {

    const { company_id } = await getUserContext(userId);

    const previous = await pool.query(
        "SELECT logo_url FROM companies WHERE id = $1",
        [company_id]
    );

    const logoUrl = `/uploads/companies/${filename}`;

    const result = await pool.query(
        `
        UPDATE companies
        SET logo_url = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, logo_url
        `,
        [logoUrl, company_id]
    );

    removeLogoFile(previous.rows[0]?.logo_url);

    return result.rows[0];
};


const deleteLogo = async (userId) => {

    const { company_id } = await getUserContext(userId);

    const previous = await pool.query(
        "SELECT logo_url FROM companies WHERE id = $1",
        [company_id]
    );

    await pool.query(
        `
        UPDATE companies
        SET logo_url = NULL,
            updated_at = NOW()
        WHERE id = $1
        `,
        [company_id]
    );

    removeLogoFile(previous.rows[0]?.logo_url);
};


module.exports = {
    getUserContext,
    getCompany,
    updateCompany,
    updateLogo,
    deleteLogo,
};