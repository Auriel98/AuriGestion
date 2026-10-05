const express = require("express");

const controller =
    require("./auth.controller");

const authenticate =
    require("../../middlewares/auth.middleware");

const {
    uploadProfilePhoto,
} = require("../../middlewares/upload.middleware");


const router =
    express.Router();


router.post(
    "/login",
    controller.login
);


router.get(
    "/me",
    authenticate,
    controller.me
);


router.put(
    "/profile/photo",
    authenticate,
    uploadProfilePhoto.single("photo"),
    controller.updateProfilePhoto
);


module.exports = router;