const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const password_hash = await bcrypt.hash("demo123", 12);
  const user = await prisma.user.upsert({
    where: { email: "jay@fintrack.in" },
    update: {},
    create: {
      name:          "Jay Prakash Shaw",
      email:         "jay@fintrack.in",
      password_hash,
      provider:      "email",
    },
  });

  console.log("✅ Demo user created:", user.email);

  // Transactions
  const txns = [
    { type:"income",  amount:45000, category:"Salary",        description:"Monthly salary — Tech Corp",  date:new Date("2025-04-01") },
    { type:"expense", amount:5000,  category:"Rent",          description:"Room rent — April",           date:new Date("2025-04-01") },
    { type:"expense", amount:3200,  category:"Food",          description:"Grocery and dining",          date:new Date("2025-04-03") },
    { type:"expense", amount:1500,  category:"Travel",        description:"Cab and fuel",                date:new Date("2025-04-05") },
    { type:"expense", amount:8500,  category:"EMI",           description:"Home loan EMI",               date:new Date("2025-04-07") },
    { type:"income",  amount:8000,  category:"Freelance",     description:"Web design project",          date:new Date("2025-04-10") },
    { type:"expense", amount:2100,  category:"Utilities",     description:"Electricity and internet",    date:new Date("2025-04-12") },
    { type:"expense", amount:4200,  category:"Shopping",      description:"Clothes and accessories",     date:new Date("2025-04-15") },
    { type:"expense", amount:999,   category:"Entertainment", description:"OTT subscriptions",           date:new Date("2025-04-18") },
    { type:"income",  amount:3000,  category:"Dividend",      description:"Stock dividend",              date:new Date("2025-04-20") },
    { type:"expense", amount:1800,  category:"Health",        description:"Gym and pharmacy",            date:new Date("2025-04-22") },
  ];

  for (const t of txns) {
    await prisma.transaction.create({ data: { user_id: user.user_id, ...t } });
  }
  console.log(`✅ ${txns.length} transactions seeded`);

  // Assets
  const assets = [
    { name:"SBI Savings Account", type:"Cash",       value:82000  },
    { name:"HDFC Fixed Deposit",  type:"Investment", value:150000 },
    { name:"Mutual Funds — Axis", type:"Investment", value:95000  },
    { name:"Stocks Portfolio",    type:"Investment", value:62000  },
    { name:"Gold (20g)",          type:"Property",   value:130000 },
  ];
  for (const a of assets) {
    await prisma.asset.create({ data: { user_id: user.user_id, ...a } });
  }
  console.log(`✅ ${assets.length} assets seeded`);

  // Liabilities
  const liabs = [
    { name:"Home Loan — SBI",       type:"Loan",        amount_owed:850000, due_date:new Date("2025-05-07") },
    { name:"Credit Card — ICICI",   type:"Credit Card", amount_owed:18500,  due_date:new Date("2025-05-02") },
    { name:"Personal Loan — Bajaj", type:"Loan",        amount_owed:42000,  due_date:new Date("2025-05-15") },
  ];
  for (const l of liabs) {
    await prisma.liability.create({ data: { user_id: user.user_id, ...l } });
  }
  console.log(`✅ ${liabs.length} liabilities seeded`);

  // Loans
  const loan1 = await prisma.loan.create({
    data: {
      user_id:       user.user_id,
      lender_name:   "SBI Home Loans",
      principal:     2500000,
      interest_rate: 8.5,
      tenure_months: 240,
      start_date:    new Date("2023-01-10"),
      emi_amount:    21700,
      amount_paid:   568400,
      status:        "active",
    },
  });
  const payments1 = [
    { month_label:"Jan 2025", emi_amount:21700, principal_part:9200, interest_part:12500, is_paid:true,  payment_date:new Date("2025-01-07") },
    { month_label:"Feb 2025", emi_amount:21700, principal_part:9265, interest_part:12435, is_paid:true,  payment_date:new Date("2025-02-07") },
    { month_label:"Mar 2025", emi_amount:21700, principal_part:9331, interest_part:12369, is_paid:true,  payment_date:new Date("2025-03-07") },
    { month_label:"Apr 2025", emi_amount:21700, principal_part:9397, interest_part:12303, is_paid:true,  payment_date:new Date("2025-04-07") },
    { month_label:"May 2025", emi_amount:21700, principal_part:9464, interest_part:12236, is_paid:false, payment_date:null },
    { month_label:"Jun 2025", emi_amount:21700, principal_part:9532, interest_part:12168, is_paid:false, payment_date:null },
  ];
  for (const p of payments1) {
    await prisma.loanPayment.create({ data: { loan_id: loan1.loan_id, ...p } });
  }

  const loan2 = await prisma.loan.create({
    data: {
      user_id:       user.user_id,
      lender_name:   "Bajaj Finserv",
      principal:     75000,
      interest_rate: 14.0,
      tenure_months: 24,
      start_date:    new Date("2024-06-01"),
      emi_amount:    3620,
      amount_paid:   36200,
      status:        "active",
    },
  });
  const payments2 = [
    { month_label:"Jan 2025", emi_amount:3620, principal_part:2470, interest_part:1150, is_paid:true,  payment_date:new Date("2025-01-01") },
    { month_label:"Feb 2025", emi_amount:3620, principal_part:2499, interest_part:1121, is_paid:true,  payment_date:new Date("2025-02-01") },
    { month_label:"Mar 2025", emi_amount:3620, principal_part:2528, interest_part:1092, is_paid:true,  payment_date:new Date("2025-03-01") },
    { month_label:"Apr 2025", emi_amount:3620, principal_part:2558, interest_part:1062, is_paid:true,  payment_date:new Date("2025-04-01") },
    { month_label:"May 2025", emi_amount:3620, principal_part:2588, interest_part:1032, is_paid:false, payment_date:null },
  ];
  for (const p of payments2) {
    await prisma.loanPayment.create({ data: { loan_id: loan2.loan_id, ...p } });
  }
  console.log("✅ 2 loans with payment history seeded");

  // Goals
  const goals = [
    { name:"Emergency Fund",          target_amount:200000, saved_amount:82000,  deadline:new Date("2025-12-31"), status:"in_progress" },
    { name:"Europe Trip 2026",        target_amount:150000, saved_amount:45000,  deadline:new Date("2026-03-31"), status:"in_progress" },
    { name:"New Laptop",              target_amount:80000,  saved_amount:80000,  deadline:new Date("2025-02-28"), status:"achieved"    },
    { name:"Investment Portfolio 5L", target_amount:500000, saved_amount:157000, deadline:new Date("2027-01-01"), status:"in_progress" },
  ];
  for (const g of goals) {
    await prisma.goal.create({ data: { user_id: user.user_id, ...g } });
  }
  console.log(`✅ ${goals.length} goals seeded`);

  // Budgets
  const budgets = [
    { category:"Food",          limit_amount:5000, spent_amount:3800, month:4, year:2025 },
    { category:"Travel",        limit_amount:3000, spent_amount:1500, month:4, year:2025 },
    { category:"Shopping",      limit_amount:3000, spent_amount:4200, month:4, year:2025 },
    { category:"Entertainment", limit_amount:1500, spent_amount:999,  month:4, year:2025 },
    { category:"Health",        limit_amount:2500, spent_amount:1800, month:4, year:2025 },
    { category:"Utilities",     limit_amount:2500, spent_amount:2100, month:4, year:2025 },
  ];
  for (const b of budgets) {
    await prisma.budget.create({ data: { user_id: user.user_id, ...b } });
  }
  console.log(`✅ ${budgets.length} budgets seeded`);

  console.log("\n🎉 Seeding complete!");
  console.log("   Demo login → Email: jay@fintrack.in | Password: demo123");
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
