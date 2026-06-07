const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const prisma   = require("../utils/prisma");
const { ok, badReq, unauth, err } = require("../utils/response");

const signToken = (user_id) =>
  jwt.sign({ user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/register
const register = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());

    try {
      const { name, email, password } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return badReq(res, "Email already registered");

      const password_hash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { name, email, password_hash, provider: "email" },
        select: { user_id: true, name: true, email: true, created_at: true },
      });

      const token = signToken(user.user_id);
      return ok(res, { user, token }, "Account created successfully", 201);
    } catch (e) {
      console.error("Register error:", e);
      return err(res);
    }
  },
];

// POST /api/auth/login
const login = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());

    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password_hash) return unauth(res, "Invalid email or password");

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return unauth(res, "Invalid email or password");

      const token = signToken(user.user_id);
      const { password_hash: _, ...safeUser } = user;
      return ok(res, { user: safeUser, token }, "Login successful");
    } catch (e) {
      console.error("Login error:", e);
      return err(res);
    }
  },
];

// POST /api/auth/firebase  — sync Firebase user into our DB and return our JWT
const firebaseSync = async (req, res) => {
  try {
    const user = req.user; // already resolved by verifyFirebaseToken middleware
    const token = signToken(user.user_id);
    const { password_hash: _, ...safeUser } = user;
    return ok(res, { user: safeUser, token }, "Firebase login successful");
  } catch (e) {
    console.error("Firebase sync error:", e);
    return err(res);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const { password_hash: _, ...safeUser } = req.user;
  return ok(res, { user: safeUser });
};

// PATCH /api/auth/profile
const updateProfile = [
  body("name").optional().trim().isLength({ min: 1, max: 100 }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badReq(res, "Validation failed", errors.array());

    try {
      const { name } = req.body;
      const user = await prisma.user.update({
        where: { user_id: req.user.user_id },
        data: { ...(name && { name }) },
        select: { user_id: true, name: true, email: true, provider: true, avatar_url: true, updated_at: true },
      });
      return ok(res, { user }, "Profile updated");
    } catch (e) {
      console.error("Update profile error:", e);
      return err(res);
    }
  },
];

module.exports = { register, login, firebaseSync, getMe, updateProfile };
