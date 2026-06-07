const { body, validationResult } = require("express-validator");
const prisma = require("../utils/prisma");
const { ok, err, notFound, badReq } = require("../utils/response");

const getAll = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month || now.getMonth() + 1);
    const year  = parseInt(req.query.year  || now.getFullYear());

    const budgets = await prisma.budget.findMany({
      where: { user_id: req.user.user_id, month, year },
      orderBy: { created_at: "asc" },
    });

    const totalBudget = budgets.reduce((s, b) => s + Number(b.limit_amount), 0);
    const totalSpent  = budgets.reduce((s, b) => s + Number(b.spent_amount), 0);
    const overBudget  = budgets.filter(b => Number(b.spent_amount) > Number(b.limit_amount));

    return ok(res, { budgets, month, year, totalBudget, totalSpent, remaining: totalBudget - totalSpent, overBudget: overBudget.length });
  } catch (e) { console.error(e); return err(res); }
};

const create = [
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("limit_amount").isFloat({ min: 1 }).withMessage("Limit must be greater than 0"),
  body("spent_amount").optional().isFloat({ min: 0 }),
  body("month").isInt({ min: 1, max: 12 }).withMessage("Month must be 1-12"),
  body("year").isInt({ min: 2000 }).withMessage("Valid year required"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const { category, limit_amount, spent_amount = 0, month, year } = req.body;

      // Upsert — update if same category+month+year exists
      const budget = await prisma.budget.upsert({
        where: {
          user_id_category_month_year: {
            user_id: req.user.user_id,
            category,
            month: parseInt(month),
            year:  parseInt(year),
          },
        },
        update: { limit_amount, spent_amount },
        create: {
          user_id: req.user.user_id,
          category, limit_amount, spent_amount,
          month: parseInt(month),
          year:  parseInt(year),
        },
      });
      return ok(res, { budget }, "Budget set", 201);
    } catch (e) { console.error(e); return err(res); }
  },
];

const update = [
  body("limit_amount").optional().isFloat({ min: 1 }),
  body("spent_amount").optional().isFloat({ min: 0 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const existing = await prisma.budget.findFirst({ where: { budget_id: req.params.id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Budget not found");

      const { limit_amount, spent_amount } = req.body;
      const budget = await prisma.budget.update({
        where: { budget_id: req.params.id },
        data: {
          ...(limit_amount !== undefined && { limit_amount }),
          ...(spent_amount !== undefined && { spent_amount }),
        },
      });
      return ok(res, { budget }, "Budget updated");
    } catch (e) { console.error(e); return err(res); }
  },
];

const remove = async (req, res) => {
  try {
    const existing = await prisma.budget.findFirst({ where: { budget_id: req.params.id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Budget not found");
    await prisma.budget.delete({ where: { budget_id: req.params.id } });
    return ok(res, null, "Budget deleted");
  } catch (e) { console.error(e); return err(res); }
};

module.exports = { getAll, create, update, remove };
