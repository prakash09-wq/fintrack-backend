const { body, param, query, validationResult } = require("express-validator");
const prisma = require("../utils/prisma");
const { ok, err, notFound, badReq } = require("../utils/response");

// GET /api/transactions
const getAll = [
  query("type").optional().isIn(["income", "expense"]),
  query("category").optional().isString(),
  query("from").optional().isDate(),
  query("to").optional().isDate(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),

  async (req, res) => {
    try {
      const uid = req.user.user_id;
      const { type, category, from, to, page = 1, limit = 50 } = req.query;

      const where = {
        user_id: uid,
        ...(type && { type }),
        ...(category && { category }),
        ...(from || to) && {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(to)   }),
          },
        },
      };

      const [total, txns] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
          where,
          orderBy: { date: "desc" },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
        }),
      ]);

      return ok(res, { transactions: txns, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (e) {
      console.error(e);
      return err(res);
    }
  },
];

// GET /api/transactions/summary
const getSummary = async (req, res) => {
  try {
    const uid = req.user.user_id;
    const { month, year } = req.query;

    const now = new Date();
    const m = parseInt(month || now.getMonth() + 1);
    const y = parseInt(year  || now.getFullYear());

    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 0, 23, 59, 59);

    const txns = await prisma.transaction.findMany({
      where: { user_id: uid, date: { gte: from, lte: to } },
    });

    const totalIncome  = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    const byCategory = {};
    txns.filter(t => t.type === "expense").forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
    });

    return ok(res, {
      month: m, year: y,
      totalIncome, totalExpense,
      netSavings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      byCategory,
      count: txns.length,
    });
  } catch (e) {
    console.error(e);
    return err(res);
  }
};

// POST /api/transactions
const create = [
  body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
  body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("date").isDate().withMessage("Valid date required"),
  body("description").optional().isString().isLength({ max: 500 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());

    try {
      const { type, amount, category, date, description } = req.body;
      const txn = await prisma.transaction.create({
        data: {
          user_id: req.user.user_id,
          type,
          amount,
          category,
          date: new Date(date),
          description: description || null,
        },
      });
      return ok(res, { transaction: txn }, "Transaction created", 201);
    } catch (e) {
      console.error(e);
      return err(res);
    }
  },
];

// PATCH /api/transactions/:id
const update = [
  body("type").optional().isIn(["income", "expense"]),
  body("amount").optional().isFloat({ min: 0.01 }),
  body("category").optional().trim().notEmpty(),
  body("date").optional().isDate(),
  body("description").optional().isString(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());

    try {
      const { id } = req.params;
      const existing = await prisma.transaction.findFirst({ where: { txn_id: id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Transaction not found");

      const { type, amount, category, date, description } = req.body;
      const txn = await prisma.transaction.update({
        where: { txn_id: id },
        data: {
          ...(type        && { type }),
          ...(amount      && { amount }),
          ...(category    && { category }),
          ...(date        && { date: new Date(date) }),
          ...(description !== undefined && { description }),
        },
      });
      return ok(res, { transaction: txn }, "Transaction updated");
    } catch (e) {
      console.error(e);
      return err(res);
    }
  },
];

// DELETE /api/transactions/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.transaction.findFirst({ where: { txn_id: id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Transaction not found");
    await prisma.transaction.delete({ where: { txn_id: id } });
    return ok(res, null, "Transaction deleted");
  } catch (e) {
    console.error(e);
    return err(res);
  }
};

module.exports = { getAll, getSummary, create, update, remove };
