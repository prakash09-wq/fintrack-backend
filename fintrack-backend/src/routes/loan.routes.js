const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/loan.controller");
const { auth } = require("../middleware/auth");

router.use(auth);
router.get("/",              ctrl.getAll);
router.get("/:id",           ctrl.getOne);
router.post("/",             ctrl.create);
router.patch("/:id",         ctrl.update);
router.patch("/:id/close",   ctrl.closeLoan);
router.post("/:id/payments", ctrl.addPayment);
router.delete("/:id",        ctrl.remove);

module.exports = router;
