const { body, validationResult } = require("express-validator");
const prisma = require("../utils/prisma");
const { ok, err, notFound, badReq } = require("../utils/response");

const getAll = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: "desc" },
    });
    const summary = {
      total: goals.length,
      achieved: goals.filter(g => g.status === "achieved").length,
      inProgress: goals.filter(g => g.status === "in_progress").length,
      avgProgress: goals.length
        ? Math.round(goals.reduce((s, g) => s + (Number(g.saved_amount) / Number(g.target_amount)) * 100, 0) / goals.length)
        : 0,
    };
    return ok(res, { goals, summary });
  } catch (e) { console.error(e); return err(res); }
};

const create = [
  body("name").trim().notEmpty().withMessage("Goal name is required"),
  body("target_amount").isFloat({ min: 1 }).withMessage("Target must be greater than 0"),
  body("saved_amount").optional().isFloat({ min: 0 }),
  body("deadline").optional().isDate(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const { name, target_amount, saved_amount = 0, deadline } = req.body;
      const status = parseFloat(saved_amount) >= parseFloat(target_amount) ? "achieved" : "in_progress";
      const goal = await prisma.goal.create({
        data: {
          user_id: req.user.user_id,
          name, target_amount, saved_amount,
          deadline: deadline ? new Date(deadline) : null,
          status,
        },
      });
      return ok(res, { goal }, "Goal created", 201);
    } catch (e) { console.error(e); return err(res); }
  },
];

const update = [
  body("name").optional().trim().notEmpty(),
  body("target_amount").optional().isFloat({ min: 1 }),
  body("saved_amount").optional().isFloat({ min: 0 }),
  body("deadline").optional().isDate(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const existing = await prisma.goal.findFirst({ where: { goal_id: req.params.id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Goal not found");

      const { name, target_amount, saved_amount, deadline } = req.body;
      const newTarget = target_amount !== undefined ? parseFloat(target_amount) : Number(existing.target_amount);
      const newSaved  = saved_amount  !== undefined ? parseFloat(saved_amount)  : Number(existing.saved_amount);
      const status    = newSaved >= newTarget ? "achieved" : "in_progress";

      const goal = await prisma.goal.update({
        where: { goal_id: req.params.id },
        data: {
          ...(name          && { name }),
          ...(target_amount !== undefined && { target_amount }),
          ...(saved_amount  !== undefined && { saved_amount }),
          ...(deadline      !== undefined && { deadline: deadline ? new Date(deadline) : null }),
          status,
        },
      });
      return ok(res, { goal }, "Goal updated");
    } catch (e) { console.error(e); return err(res); }
  },
];

const remove = async (req, res) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { goal_id: req.params.id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Goal not found");
    await prisma.goal.delete({ where: { goal_id: req.params.id } });
    return ok(res, null, "Goal deleted");
  } catch (e) { console.error(e); return err(res); }
};

// POST /api/goals/:id/add-savings
const addSavings = [
  body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be greater than 0"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const existing = await prisma.goal.findFirst({ where: { goal_id: req.params.id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Goal not found");

      const newSaved = Math.min(Number(existing.saved_amount) + parseFloat(req.body.amount), Number(existing.target_amount));
      const status   = newSaved >= Number(existing.target_amount) ? "achieved" : "in_progress";

      const goal = await prisma.goal.update({
        where: { goal_id: req.params.id },
        data: { saved_amount: newSaved, status },
      });
      return ok(res, { goal }, "Savings added");
    } catch (e) { console.error(e); return err(res); }
  },
];

module.exports = { getAll, create, update, remove, addSavings };
