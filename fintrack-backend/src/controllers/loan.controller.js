const { body, validationResult } = require("express-validator");
const prisma = require("../utils/prisma");
const { ok, err, notFound, badReq } = require("../utils/response");

const calcEMI = (principal, rate, months) => {
  const r = rate / 12 / 100;
  if (!r) return Math.round(principal / months);
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
};

const getAll = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { user_id: req.user.user_id },
      include: { payments: { orderBy: { created_at: "asc" } } },
      orderBy: { created_at: "desc" },
    });
    const active = loans.filter(l => l.status === "active");
    const totalEMI = active.reduce((s, l) => s + Number(l.emi_amount), 0);
    const totalOutstanding = active.reduce((s, l) => s + (Number(l.principal) - Number(l.amount_paid)), 0);
    return ok(res, { loans, totalEMI, totalOutstanding });
  } catch (e) { console.error(e); return err(res); }
};

const getOne = async (req, res) => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { loan_id: req.params.id, user_id: req.user.user_id },
      include: { payments: { orderBy: { created_at: "asc" } } },
    });
    if (!loan) return notFound(res, "Loan not found");
    const emi = Number(loan.emi_amount);
    const paid = Number(loan.amount_paid);
    const outstanding = Number(loan.principal) - paid;
    const monthsLeft = Math.max(0, loan.tenure_months - Math.round(paid / Math.max(emi, 1)));
    const totalCost = emi * loan.tenure_months;
    const totalInterest = totalCost - Number(loan.principal);
    return ok(res, { loan, outstanding, monthsLeft, totalCost, totalInterest });
  } catch (e) { console.error(e); return err(res); }
};

const create = [
  body("lender_name").trim().notEmpty().withMessage("Lender name is required"),
  body("principal").isFloat({ min: 1 }).withMessage("Principal must be greater than 0"),
  body("interest_rate").isFloat({ min: 0 }).withMessage("Interest rate must be 0 or more"),
  body("tenure_months").isInt({ min: 1 }).withMessage("Tenure must be at least 1 month"),
  body("start_date").isDate().withMessage("Valid start date required"),
  body("amount_paid").optional().isFloat({ min: 0 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const { lender_name, principal, interest_rate, tenure_months, start_date, amount_paid = 0 } = req.body;
      const emi = calcEMI(parseFloat(principal), parseFloat(interest_rate), parseInt(tenure_months));
      const loan = await prisma.loan.create({
        data: {
          user_id: req.user.user_id,
          lender_name,
          principal,
          interest_rate,
          tenure_months: parseInt(tenure_months),
          start_date: new Date(start_date),
          emi_amount: emi,
          amount_paid,
          status: "active",
        },
      });
      return ok(res, { loan }, "Loan created", 201);
    } catch (e) { console.error(e); return err(res); }
  },
];

const update = [
  body("lender_name").optional().trim().notEmpty(),
  body("principal").optional().isFloat({ min: 1 }),
  body("interest_rate").optional().isFloat({ min: 0 }),
  body("tenure_months").optional().isInt({ min: 1 }),
  body("start_date").optional().isDate(),
  body("amount_paid").optional().isFloat({ min: 0 }),
  body("status").optional().isIn(["active", "closed"]),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const existing = await prisma.loan.findFirst({ where: { loan_id: req.params.id, user_id: req.user.user_id } });
      if (!existing) return notFound(res, "Loan not found");

      const { lender_name, principal, interest_rate, tenure_months, start_date, amount_paid, status } = req.body;

      // Recalculate EMI if principal/rate/tenure changed
      const newPrincipal = principal !== undefined ? parseFloat(principal) : Number(existing.principal);
      const newRate      = interest_rate !== undefined ? parseFloat(interest_rate) : Number(existing.interest_rate);
      const newTenure    = tenure_months !== undefined ? parseInt(tenure_months) : existing.tenure_months;
      const newEMI       = calcEMI(newPrincipal, newRate, newTenure);

      const loan = await prisma.loan.update({
        where: { loan_id: req.params.id },
        data: {
          ...(lender_name    && { lender_name }),
          ...(principal      !== undefined && { principal }),
          ...(interest_rate  !== undefined && { interest_rate }),
          ...(tenure_months  !== undefined && { tenure_months: parseInt(tenure_months) }),
          ...(start_date     && { start_date: new Date(start_date) }),
          ...(amount_paid    !== undefined && { amount_paid }),
          ...(status         && { status }),
          emi_amount: newEMI,
        },
      });
      return ok(res, { loan }, "Loan updated");
    } catch (e) { console.error(e); return err(res); }
  },
];

const remove = async (req, res) => {
  try {
    const existing = await prisma.loan.findFirst({ where: { loan_id: req.params.id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Loan not found");
    await prisma.loan.delete({ where: { loan_id: req.params.id } });
    return ok(res, null, "Loan deleted");
  } catch (e) { console.error(e); return err(res); }
};

// PATCH /api/loans/:id/close
const closeLoan = async (req, res) => {
  try {
    const existing = await prisma.loan.findFirst({ where: { loan_id: req.params.id, user_id: req.user.user_id } });
    if (!existing) return notFound(res, "Loan not found");
    const loan = await prisma.loan.update({
      where: { loan_id: req.params.id },
      data: { status: "closed", amount_paid: existing.principal },
    });
    return ok(res, { loan }, "Loan marked as closed");
  } catch (e) { console.error(e); return err(res); }
};

// POST /api/loans/:id/payments
const addPayment = [
  body("month_label").trim().notEmpty().withMessage("Month label required"),
  body("emi_amount").isFloat({ min: 0 }),
  body("principal_part").isFloat({ min: 0 }),
  body("interest_part").isFloat({ min: 0 }),
  body("is_paid").optional().isBoolean(),
  body("payment_date").optional().isDate(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());
    try {
      const loan = await prisma.loan.findFirst({ where: { loan_id: req.params.id, user_id: req.user.user_id } });
      if (!loan) return notFound(res, "Loan not found");

      const { month_label, emi_amount, principal_part, interest_part, is_paid = true, payment_date } = req.body;

      const payment = await prisma.loanPayment.create({
        data: {
          loan_id: req.params.id,
          month_label, emi_amount, principal_part, interest_part,
          is_paid,
          payment_date: payment_date ? new Date(payment_date) : (is_paid ? new Date() : null),
        },
      });

      // Update amount_paid on loan
      if (is_paid) {
        await prisma.loan.update({
          where: { loan_id: req.params.id },
          data: { amount_paid: { increment: parseFloat(principal_part) } },
        });
      }

      return ok(res, { payment }, "Payment recorded", 201);
    } catch (e) { console.error(e); return err(res); }
  },
];

module.exports = { getAll, getOne, create, update, remove, closeLoan, addPayment };
