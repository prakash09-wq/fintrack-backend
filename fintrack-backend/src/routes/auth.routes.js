// routes/auth.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/auth.controller");
const { auth, verifyFirebaseToken } = require("../middleware/auth");

router.post("/register", ctrl.register);
router.post("/login",    ctrl.login);
router.post("/firebase", verifyFirebaseToken, ctrl.firebaseSync);
router.get( "/me",       auth, ctrl.getMe);
router.patch("/profile", auth, ctrl.updateProfile);

module.exports = router;
