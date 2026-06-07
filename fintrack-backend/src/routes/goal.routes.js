const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/goal.controller");
const { auth } = require("../middleware/auth");

router.use(auth);
router.get("/",                  ctrl.getAll);
router.post("/",                 ctrl.create);
router.patch("/:id",             ctrl.update);
router.post("/:id/add-savings",  ctrl.addSavings);
router.delete("/:id",            ctrl.remove);

module.exports = router;
