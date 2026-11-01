const express = require("express");

const router = express.Router();

/* =====================================================
   MIDDLEWARES
===================================================== */

const authMiddleware = require(
    "../../middlewares/auth.middleware"
);

const {
    uploadEmployeePhoto,
} = require("../../middlewares/upload.middleware");

/* =====================================================
   CONTRÔLEUR PROFIL
===================================================== */

const {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    updateMyPhoto,
    deleteMyPhoto,
} = require(
    "../../controllers/profile/profile.controller"
);

/* =====================================================
   AUTHENTIFICATION
   Tout utilisateur connecté peut gérer son propre profil.
===================================================== */

router.use(authMiddleware);

/* =====================================================
   CONSULTER MON PROFIL
   GET /api/profile
===================================================== */

router.get(
    "/",
    getMyProfile
);

/* =====================================================
   MODIFIER MON PROFIL
   PUT /api/profile
===================================================== */

router.put(
    "/",
    updateMyProfile
);

/* =====================================================
   MODIFIER MON MOT DE PASSE
   PUT /api/profile/password
===================================================== */

router.put(
    "/password",
    changeMyPassword
);

/* =====================================================
   MODIFIER MA PHOTO DE PROFIL
   PUT /api/profile/photo
   Type : multipart/form-data
   Nom du champ fichier : photo
===================================================== */

router.put(
    "/photo",
    uploadEmployeePhoto.single("photo"),
    updateMyPhoto
);

/* =====================================================
   SUPPRIMER MA PHOTO DE PROFIL
   DELETE /api/profile/photo
===================================================== */

router.delete(
    "/photo",
    deleteMyPhoto
);

module.exports = router;