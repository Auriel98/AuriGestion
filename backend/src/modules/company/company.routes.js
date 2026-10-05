const express = require("express");

const controller = require("./company.controller");

const authenticate = require("../../middlewares/auth.middleware");

const {
    uploadCompanyLogo,
} = require("../../middlewares/upload.middleware");


const router = express.Router();


// Gère proprement les erreurs multer (format, taille...)
const logoUpload = (req, res, next) => {

    uploadCompanyLogo.single("logo")(req, res, (err) => {

        if (!err) return next();

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "Le logo ne doit pas dépasser 2 Mo",
            });
        }

        return res.status(400).json({ message: err.message });
    });
};


router.get("/", authenticate, controller.getCompany);

router.put("/", authenticate, controller.updateCompany);

router.put("/logo", authenticate, logoUpload, controller.updateLogo);

router.delete("/logo", authenticate, controller.deleteLogo);


module.exports = router;