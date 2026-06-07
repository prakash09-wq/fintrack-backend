const prisma = require("../utils/prisma");
const { ok, err } = require("../utils/response");

const calcEMI = (principal, rate, months) => {
  const r = rate / 12 / 100;
  if (!r) return Math.round(principal / months);
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
};

// GET /api/analysis/networth
const getNetWorth = async (req, res) => {
  try {
    const uid = req.user.user_id;
    const [assets, liabilities] = await Promise.all([
      prisma.asset.findMany({ where: { user_id: uid } }),
      prisma.liability.findMany({ where: { user_id: uid } }),
    ]);
    const totalAssets      = assets.reduce((s, a) => s + Number(a.value), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.amount_owed), 0);
    const netWorth         = totalAssets - totalLiabilities;

    const byAssetType = {};
    assets.forEach(a => { byAssetType[a.type] = (byAssetType[a.type] || 0) + Number(a.value); });

    return ok(res, { totalAssets, totalLiabilities, netWorth, byAssetType, assets, liabilities });
  } catch (e) { console.error(e); return err(res); }
};

// GET /api/analysis/score
const getHealthScore = async (req, res) => {
  try {
    const uid = req.user.user_id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const from  = new Date(year, month - 1, 1);
    const to    = new Date(year, month, 0, 23, 59, 59);

    const [txns, budgets, loans, goals] = await Promise.all([
      prisma.transaction.findMany({ where: { user_id: uid, date: { gte: from, lte: to } } }),
      prisma.budget.findMany({ where: { user_id: uid, month, year } }),
      prisma.loan.findMany({ where: { user_id: uid, status: "active" } }),
      prisma.goal.findMany({ where: { user_id: uid } }),
    ]);

    // Savings Rate
    const income  = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const sr = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    // Budget Adherence
    const ba = budgets.length > 0
      ? Math.round((budgets.filter(b => Number(b.spent_amount) <= Number(b.limit_amount)).length / budgets.length) * 100)
      : 100;

    // EMI to Income ratio
    const totalEMI = loans.reduce((s, l) => s + calcEMI(Number(l.principal), Number(l.interest_rate), l.tenure_months), 0);
    const er = income > 0 ? Math.round((totalEMI / income) * 100) : 0;

    // Goals progress
    const gp = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + (Number(g.saved_amount) / Number(g.target_amount)) * 100, 0) / goals.length)
      : 0;

    // Composite score
    const score = Math.min(100, Math.round(
      (sr >= 30 ? 25 : sr >= 20 ? 20 : sr >= 10 ? 14 : 7) +
      (ba >= 90 ? 25 : ba >= 70 ? 18 : ba >= 50 ? 12 : 6) +
      (er <= 15 ? 25 : er <= 25 ? 20 : er <= 35 ? 14 : 7) +
      (gp >= 60 ? 25 : gp >= 40 ? 20 : gp >= 20 ? 14 : 7)
    ));

    const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 55 ? "Fair" : "Needs Work";

    // Generate insights
    const insights = [];
    if (sr >= 20) insights.push({ type: "success", title: "Strong Savings", body: `Saving ${sr}% of income — above the 20% target.` });
    else          insights.push({ type: "warn",    title: "Low Savings Rate", body: `Savings rate is ${sr}%. Try to reduce discretionary spending.` });

    if (ba >= 80) insights.push({ type: "success", title: "Budget on Track", body: `${ba}% of categories within budget this month.` });
    else          insights.push({ type: "warn",    title: "Budget Overruns",  body: `Only ${ba}% of categories within budget. Review spending.` });

    if (er < 30) insights.push({ type: "success", title: "Healthy Debt Load", body: `EMIs at ${er}% of income — within the 30% safe zone.` });
    else         insights.push({ type: "danger",  title: "High EMI Burden",   body: `EMIs consume ${er}% of income. Consider prepaying a loan.` });

    insights.push({ type: "info", title: "Investment Tip", body: "Fixed Deposits earn ~7% p.a. Index funds may offer better long-term returns." });

    return ok(res, {
      score, label, month, year,
      metrics: { savingsRate: sr, budgetAdherence: ba, emiRatio: er, goalsProgress: gp },
      insights,
      rawData: { income, expense, totalEMI, budgetCount: budgets.length, goalCount: goals.length },
    });
  } catch (e) { console.error(e); return err(res); }
};

// GET /api/analysis/report?months=6
const getReport = async (req, res) => {
  try {
    const uid    = req.user.user_id;
    const months = Math.min(parseInt(req.query.months || 6), 12);
    const now    = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const txns = await prisma.transaction.findMany({
        where: { user_id: uid, date: { gte: from, lte: to } },
      });

      const income  = txns.filter(t => t.type === "income").reduce((s, t)  => s + Number(t.amount), 0);
      const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

      result.push({
        month:       d.getMonth() + 1,
        year:        d.getFullYear(),
        monthLabel:  d.toLocaleString("en-IN", { month: "short" }),
        income,
        expense,
        savings:     income - expense,
        savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      });
    }

    return ok(res, { report: result, months });
  } catch (e) { console.error(e); return err(res); }
};

// GET /api/analysis/categories?month=4&year=2025
const getCategories = async (req, res) => {
  try {
    const uid   = req.user.user_id;
    const now   = new Date();
    const month = parseInt(req.query.month || now.getMonth() + 1);
    const year  = parseInt(req.query.year  || now.getFullYear());
    const from  = new Date(year, month - 1, 1);
    const to    = new Date(year, month, 0, 23, 59, 59);

    const txns = await prisma.transaction.findMany({
      where: { user_id: uid, type: "expense", date: { gte: from, lte: to } },
    });

    const byCategory = {};
    txns.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount); });

    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const categories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }));

    return ok(res, { categories, total, month, year });
  } catch (e) { console.error(e); return err(res); }
};

module.exports = { getNetWorth, getHealthScore, getReport, getCategories };
