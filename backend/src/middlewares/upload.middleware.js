const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = path.join(
    __dirname,
    "../../uploads"
);


/* =====================================================
   PHOTO DE PROFIL
===================================================== */

const profileDirectory = path.join(
    uploadRoot,
    "profiles"
);

if (!fs.existsSync(profileDirectory)) {
    fs.mkdirSync(profileDirectory, {
        recursive: true,
    });
}

const profileStorage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            profileDirectory
        );

    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(
                file.originalname
            ).toLowerCase();

        const filename =
            `profile-${req.user.userId}-${Date.now()}${extension}`;

        cb(
            null,
            filename
        );

    },

});


const profileFileFilter = (
    req,
    file,
    cb
) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (
        allowedTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Format accepté : JPG, PNG ou WEBP"
            )
        );

    }

};


const uploadProfilePhoto =
    multer({

        storage: profileStorage,

        fileFilter:
            profileFileFilter,

        limits: {
            fileSize:
                5 * 1024 * 1024,
        },

    });


    

/* =====================================================
   DOCUMENTS EMPLOYÉS
===================================================== */

const employeeDocumentStorage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            const employeeId =
                req.body.employee_id;

            if (!employeeId) {

                return cb(
                    new Error(
                        "employee_id est obligatoire"
                    )
                );

            }

            const employeeDirectory =
                path.join(
                    uploadRoot,
                    "employees",
                    employeeId
                );

            if (
                !fs.existsSync(
                    employeeDirectory
                )
            ) {

                fs.mkdirSync(
                    employeeDirectory,
                    {
                        recursive: true,
                    }
                );

            }

            cb(
                null,
                employeeDirectory
            );

        },

        filename: (
            req,
            file,
            cb
        ) => {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();

            const safeName =
                path.basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-"
                )
                .substring(
                    0,
                    80
                );

            const filename =
                `${Date.now()}-${safeName}${extension}`;

            cb(
                null,
                filename
            );

        },

    });


const employeeDocumentFileFilter =
    (
        req,
        file,
        cb
    ) => {

        const allowedTypes = [

            // PDF
            "application/pdf",

            // Word
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

            // Excel
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            // Images
            "image/jpeg",
            "image/png",
            "image/webp",

        ];

        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Format de document non autorisé"
                )
            );

        }

    };


const uploadEmployeeDocument =
    multer({

        storage:
            employeeDocumentStorage,

        fileFilter:
            employeeDocumentFileFilter,

        limits: {

            // 10 Mo
            fileSize:
                10 * 1024 * 1024,

        },

    });


/* =====================================================
   LOGO ENTREPRISE
===================================================== */

const companyLogoDirectory = path.join(
    uploadRoot,
    "companies"
);

if (!fs.existsSync(companyLogoDirectory)) {
    fs.mkdirSync(companyLogoDirectory, {
        recursive: true,
    });
}

const companyLogoStorage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, companyLogoDirectory);
    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(
                file.originalname
            ).toLowerCase();

        const filename =
            `logo-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`;

        cb(null, filename);
    },

});

const companyLogoFileFilter = (
    req,
    file,
    cb
) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Format accepté : JPG, PNG ou WEBP"
            )
        );
    }

};

const uploadCompanyLogo = multer({

    storage: companyLogoStorage,

    fileFilter: companyLogoFileFilter,

    limits: {
        fileSize: 2 * 1024 * 1024, // 2 Mo
    },

});




module.exports = {

    uploadProfilePhoto,

    uploadEmployeeDocument,
    uploadCompanyLogo,

};