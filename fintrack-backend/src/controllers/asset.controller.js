const { body, validationResult } = require("express-validator");
const prisma = require("../utils/prisma");
const { ok, err, notFound, badReq } = require("../utils/response");

const getAll = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: "desc" },
    });
    const total = assets.reduce((s, a) => s + Number(a.value), 0);
    return ok(res, { assets, total });
  } catch (e) { console.error(e); return err(res); }
};

const create = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("type").trim().notEmpty().withMessage("Type is required"),
  body("value").isFloat({ min: 0 }).withMessage("Value must be 0 or more"),
  body("date_recorded").optional().isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const { name, type, value, date_recorded } = req.body;
      const asset = await prisma.asset.create({
        data: {
          user_id: req.user.user_id,
          name, type, value,
          date_recorded: date_recorded ? new Date(date_recorded) : new Date(),
        },
      });
      return ok(res, { asset }, "Asset created", 201);
    } catch (e) { console.error(e); return err(res); }
  },
];

const update = [
  body("name").optional().trim().notEmpty(),
  body("type").optional().trim().notEmpty(),
  body("value").optional().isFloat({ min: 0 }),
  body("date_recorded").optional().isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const existing = await prisma.asset.findFirst({ where: { asset_id: req.params.id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Asset not found");
      const { name, type, value, date_recorded } = req.body;
      const asset = await prisma.asset.update({
        where: { asset_id: req.params.id },
        data: {
          ...(name          && { name }),
          ...(type          && { type }),
          ...(value         !== undefined && { value }),
          ...(date_recorded && { date_recorded: new Date(date_recorded) }),
        },
      });
      return ok(res, { asset }, "Asset updated");
    } catch (e) { console.error(e); return err(res); }
  },
];

const remove = async (req, res) => {
  try {
    const existing = await prisma.asset.findFirst({ where: { asset_id: req.params.id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Asset not found");
    await prisma.asset.delete({ where: { asset_id: req.params.id } });
    return ok(res, null, "Asset deleted");
  } catch (e) { console.error(e); return err(res); }
};

module.exports = { getAll, create, update, remove };
