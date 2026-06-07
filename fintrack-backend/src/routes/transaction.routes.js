const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/transaction.controller");
const { auth } = require("../middleware/auth");

router.use(auth);
router.get("/",          ctrl.getAll);
router.get("/summary",   ctrl.getSummary);
router.post("/",         ctrl.create);
router.patch("/:id",     ctrl.update);
router.delete("/:id",    ctrl.remove);

module.exports = router;
