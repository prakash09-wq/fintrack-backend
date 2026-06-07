const { body, validationResult } = require("express-validator");
const prisma = require("../utils/prisma");
const { ok, err, notFound, badReq } = require("../utils/response");

const getAll = async (req, res) => {
  try {
    const liabilities = await prisma.liability.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: "desc" },
    });
    const total = liabilities.reduce((s, l) => s + Number(l.amount_owed), 0);
    return ok(res, { liabilities, total });
  } catch (e) { console.error(e); return err(res); }
};

const create = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("type").trim().notEmpty().withMessage("Type is required"),
  body("amount_owed").isFloat({ min: 0 }).withMessage("Amount must be 0 or more"),
  body("due_date").optional().isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const { name, type, amount_owed, due_date } = req.body;
      const liability = await prisma.liability.create({
        data: {
          user_id: req.user.user_id,
          name, type, amount_owed,
          due_date: due_date ? new Date(due_date) : null,
        },
      });
      return ok(res, { liability }, "Liability created", 201);
    } catch (e) { console.error(e); return err(res); }
  },
];

const update = [
  body("name").optional().trim().notEmpty(),
  body("type").optional().trim().notEmpty(),
  body("amount_owed").optional().isFloat({ min: 0 }),
  body("due_date").optional().isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const existing = await prisma.liability.findFirst({ where: { liability_id: req.params.id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Liability not found");
      const { name, type, amount_owed, due_date } = req.body;
      const liability = await prisma.liability.update({
        where: { liability_id: req.params.id },
        data: {
          ...(name         && { name }),
          ...(type         && { type }),
          ...(amount_owed  !== undefined && { amount_owed }),
          ...(due_date     !== undefined && { due_date: due_date ? new Date(due_date) : null }),
        },
      });
      return ok(res, { liability }, "Liability updated");
    } catch (e) { console.error(e); return err(res); }
  },
];

const remove = async (req, res) => {
  try {
    const existing = await prisma.liability.findFirst({ where: { liability_id: req.params.id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Liability not found");
    await prisma.liability.delete({ where: { liability_id: req.params.id } });
    return ok(res, null, "Liability deleted");
  } catch (e) { console.error(e); return err(res); }
};

module.exports = { getAll, create, update, remove };
