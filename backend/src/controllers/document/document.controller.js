const pool = require("../../config/db");
const fs = require("fs");
const path = require("path");


/* =====================================================
   DOCUMENTS D'UN EMPLOYÉ
===================================================== */

const getEmployeeDocuments = async (req, res) => {

    try {

        const { employeeId } = req.params;

        const result = await pool.query(
            `
            SELECT
                d.id,
                d.employee_id,
                d.contract_id,

                d.document_type,
                d.title,

                d.file_url,
                d.file_name,
                d.file_size,
                d.mime_type,

                d.expiry_date,
                d.notes,

                d.uploaded_at,
                d.updated_at,

                ec.contract_type,
                ec.contract_number

            FROM employee_documents d

            LEFT JOIN employee_contracts ec
                ON ec.id = d.contract_id

            WHERE d.employee_id = $1
              AND d.company_id = $2

            ORDER BY d.uploaded_at DESC
            `,
            [
                employeeId,
                req.user.companyId,
            ]
        );

        return res.json(result.rows);

    } catch (error) {

        console.error(
            "Erreur récupération documents :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la récupération des documents",
        });

    }
};


/* =====================================================
   AJOUTER UN DOCUMENT
===================================================== */

const createDocument = async (req, res) => {

    let uploadedFile = null;

    try {

        uploadedFile = req.file;

        if (!uploadedFile) {

            return res.status(400).json({
                message:
                    "Aucun document reçu",
            });

        }

        const {
            employee_id,
            contract_id,
            document_type,
            title,
            expiry_date,
            notes,
        } = req.body;


        if (
            !employee_id ||
            !document_type ||
            !title
        ) {

            return res.status(400).json({
                message:
                    "Employé, type de document et titre sont obligatoires",
            });

        }


        /* ---------------------------------------------
           Vérifier l'employé
        --------------------------------------------- */

        const employeeResult =
            await pool.query(
                `
                SELECT id
                FROM employees
                WHERE id = $1
                  AND company_id = $2
                `,
                [
                    employee_id,
                    req.user.companyId,
                ]
            );


        if (
            employeeResult.rowCount === 0
        ) {

            return res.status(404).json({
                message:
                    "Employé introuvable",
            });

        }


        /* ---------------------------------------------
           Vérifier le contrat si fourni
        --------------------------------------------- */

        if (contract_id) {

            const contractResult =
                await pool.query(
                    `
                    SELECT id
                    FROM employee_contracts
                    WHERE id = $1
                      AND employee_id = $2
                      AND company_id = $3
                    `,
                    [
                        contract_id,
                        employee_id,
                        req.user.companyId,
                    ]
                );


            if (
                contractResult.rowCount === 0
            ) {

                return res.status(400).json({
                    message:
                        "Le contrat sélectionné est invalide",
                });

            }

        }


        /* ---------------------------------------------
           URL du fichier
        --------------------------------------------- */

        const fileUrl =
            `/uploads/employees/${employee_id}/${uploadedFile.filename}`;


        /* ---------------------------------------------
           Enregistrer en base
        --------------------------------------------- */

        const result =
            await pool.query(
                `
                INSERT INTO employee_documents (
                    company_id,
                    employee_id,
                    contract_id,
                    document_type,
                    title,
                    file_url,
                    file_name,
                    file_size,
                    mime_type,
                    expiry_date,
                    notes
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11
                )

                RETURNING *
                `,
                [
                    req.user.companyId,
                    employee_id,
                    contract_id || null,
                    document_type,
                    title,
                    fileUrl,
                    uploadedFile.originalname,
                    uploadedFile.size,
                    uploadedFile.mimetype,
                    expiry_date || null,
                    notes || null,
                ]
            );


        return res.status(201).json({
            message:
                "Document ajouté avec succès",

            document:
                result.rows[0],
        });


    } catch (error) {

        console.error(
            "Erreur ajout document :",
            error
        );


        /* ---------------------------------------------
           Supprimer le fichier si PostgreSQL échoue
        --------------------------------------------- */

        if (
            uploadedFile &&
            uploadedFile.path
        ) {

            try {

                if (
                    fs.existsSync(
                        uploadedFile.path
                    )
                ) {

                    fs.unlinkSync(
                        uploadedFile.path
                    );

                }

            } catch (deleteError) {

                console.error(
                    "Erreur suppression fichier :",
                    deleteError
                );

            }

        }


        return res.status(500).json({
            message:
                "Erreur lors de l'ajout du document",
        });

    }
};


/* =====================================================
   SUPPRIMER UN DOCUMENT
===================================================== */

const deleteDocument = async (req, res) => {

    try {

        const { id } = req.params;


        /* ---------------------------------------------
           Récupérer le document
        --------------------------------------------- */

        const documentResult =
            await pool.query(
                `
                SELECT
                    id,
                    file_url
                FROM employee_documents

                WHERE id = $1
                  AND company_id = $2
                `,
                [
                    id,
                    req.user.companyId,
                ]
            );


        if (
            documentResult.rowCount === 0
        ) {

            return res.status(404).json({
                message:
                    "Document introuvable",
            });

        }


        const document =
            documentResult.rows[0];


        /* ---------------------------------------------
           Supprimer de PostgreSQL
        --------------------------------------------- */

        await pool.query(
            `
            DELETE FROM employee_documents

            WHERE id = $1
              AND company_id = $2
            `,
            [
                id,
                req.user.companyId,
            ]
        );


        /* ---------------------------------------------
           Supprimer le fichier physique
        --------------------------------------------- */

        if (document.file_url) {

            const relativePath =
                document.file_url
                    .replace(
                        /^\/uploads\//,
                        ""
                    );

            const filePath =
                path.join(
                    __dirname,
                    "../../../uploads",
                    relativePath
                );


            if (
                fs.existsSync(filePath)
            ) {

                fs.unlinkSync(
                    filePath
                );

            }

        }


        return res.json({
            message:
                "Document supprimé avec succès",
        });


    } catch (error) {

        console.error(
            "Erreur suppression document :",
            error
        );

        return res.status(500).json({
            message:
                "Erreur lors de la suppression du document",
        });

    }
};


module.exports = {
    getEmployeeDocuments,
    createDocument,
    deleteDocument,
};