require("dotenv").config();
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const rateLimit   = require("express-rate-limit");
const prisma      = require("./utils/prisma");

const authRoutes        = require("./routes/auth.routes");
const transactionRoutes = require("./routes/transaction.routes");
const assetRoutes       = require("./routes/asset.routes");
const liabilityRoutes   = require("./routes/liability.routes");
const loanRoutes        = require("./routes/loan.routes");
const goalRoutes        = require("./routes/goal.routes");

const analysisRoutes    = require("./routes/analysis.routes");

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Security & Middleware ── */
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || "*",
  credentials: true,
  methods:     ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Rate Limiting ── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message: { success: false, message: "Too many login attempts, please try again later." },
});

app.use("/api", limiter);
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

/* ── Health Check ── */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FinTrack API is running",
    version: "1.0.0",
    project: "NSU BCA Final Year Project 2023-2026",
    team: ["Jay Prakash Shaw", "Sourav Bhattacharjee", "Sujay Kumar Giri"],
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: "Server and database are healthy", timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ success: false, message: "Database connection failed", error: e.message });
  }
});

/* ── API Routes ── */
app.use("/api/auth",         authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/assets",       assetRoutes);
app.use("/api/liabilities",  liabilityRoutes);
app.use("/api/loans",        loanRoutes);
app.use("/api/goals",        goalRoutes);

app.use("/api/analysis",     analysisRoutes);

/* ── 404 Handler ── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

/* ── Global Error Handler ── */
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
  });
});

/* ── Start Server ── */
async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma");
    app.listen(PORT,'0.0.0.0' () => {
      console.log(`🚀 FinTrack API running on http://localhost:${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (e) {
    console.error("❌ Failed to connect to database:", e.message);
    console.error("   Make sure PostgreSQL is running and DATABASE_URL is correct in .env");
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing server...");
  await prisma.$disconnect();
  process.exit(0);
});
