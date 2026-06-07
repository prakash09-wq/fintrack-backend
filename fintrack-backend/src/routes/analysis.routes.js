const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/analysis.controller");
const { auth } = require("../middleware/auth");

router.use(auth);
router.get("/networth",   ctrl.getNetWorth);
router.get("/score",      ctrl.getHealthScore);
router.get("/report",     ctrl.getReport);
router.get("/categories", ctrl.getCategories);

module.exports = router;
