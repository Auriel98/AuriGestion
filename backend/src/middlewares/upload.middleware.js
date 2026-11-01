const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =====================================================
   CONFIGURATION GÉNÉRALE
===================================================== */

const uploadRoot = path.resolve(
    __dirname,
    "../../uploads"
);

// Création automatique d'un dossier si nécessaire.
const ensureDirectory = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true,
        });
    }
};

// Création du dossier principal.
ensureDirectory(uploadRoot);


/* =====================================================
   FILTRE COMMUN : IMAGES
   Formats acceptés : JPG / JPEG / PNG / WEBP
===================================================== */

const profileFileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(
        new Error("Format accepté : JPG, PNG ou WEBP")
    );
};


/* =====================================================
   1. PHOTO DE PROFIL UTILISATEUR
   Dossier : uploads/profiles/
===================================================== */

const profileDirectory = path.join(
    uploadRoot,
    "profiles"
);

ensureDirectory(profileDirectory);

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        const userId = req.user?.userId;

        if (!userId) {
            return cb(
                new Error("Utilisateur non authentifié")
            );
        }

        const filename =
            `profile-${userId}-${Date.now()}${extension}`;

        cb(null, filename);
    },
});

const uploadProfilePhoto = multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});


/* =====================================================
   2. PHOTO EMPLOYÉ
   Dossier : uploads/employee-photos/

   Important :
   L'employé peut ne pas encore exister en base
   lors de la création de sa fiche.
===================================================== */

const employeePhotoDirectory = path.join(
    uploadRoot,
    "employee-photos"
);

ensureDirectory(employeePhotoDirectory);

const employeePhotoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, employeePhotoDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        const filename =
            `employee-${Date.now()}-${Math.round(
                Math.random() * 1e6
            )}${extension}`;

        cb(null, filename);
    },
});

const uploadEmployeePhoto = multer({
    storage: employeePhotoStorage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});


/* =====================================================
   3. DOCUMENTS EMPLOYÉS
   Dossier : uploads/employees/:employeeId/

   Formats :
   PDF, Word, Excel, JPG, PNG, WEBP
===================================================== */

const employeeDocumentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const employeeId = req.body.employee_id;

        if (
            !employeeId ||
            !/^\d+$/.test(String(employeeId))
        ) {
            return cb(
                new Error(
                    "Un employee_id numérique valide est obligatoire"
                )
            );
        }

        const employeeDirectory = path.join(
            uploadRoot,
            "employees",
            String(employeeId)
        );

        ensureDirectory(employeeDirectory);

        cb(null, employeeDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        const originalName = path.basename(
            file.originalname,
            extension
        );

        const safeName = originalName
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .substring(0, 80) || "document";

        const filename =
            `${Date.now()}-${safeName}${extension}`;

        cb(null, filename);
    },
});

const employeeDocumentFileFilter = (
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

    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(
        new Error("Format de document non autorisé")
    );
};

const uploadEmployeeDocument = multer({
    storage: employeeDocumentStorage,
    fileFilter: employeeDocumentFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});


/* =====================================================
   4. LOGO ENTREPRISE
   Dossier : uploads/companies/
===================================================== */

const companyLogoDirectory = path.join(
    uploadRoot,
    "companies"
);

ensureDirectory(companyLogoDirectory);

const companyLogoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, companyLogoDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(
            file.originalname
        ).toLowerCase();

        const filename =
            `logo-${Date.now()}-${Math.round(
                Math.random() * 1e6
            )}${extension}`;

        cb(null, filename);
    },
});

const uploadCompanyLogo = multer({
    storage: companyLogoStorage,
    fileFilter: profileFileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
    uploadRoot,

    // Photos
    uploadProfilePhoto,
    uploadEmployeePhoto,

    // Documents
    uploadEmployeeDocument,

    // Entreprise
    uploadCompanyLogo,
};
