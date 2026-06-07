const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const { unauth } = require("../utils/response");

// Verify our own JWT (email/password login)
const verifyJWT = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return unauth(res, "No token provided");

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { user_id: decoded.user_id } });
    if (!user) return unauth(res, "User not found");

    req.user = user;
    next();
  } catch (e) {
    if (e.name === "TokenExpiredError") return unauth(res, "Token expired");
    return unauth(res, "Invalid token");
  }
};

// Verify Firebase ID token (Google login)
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return unauth(res, "No token provided");

    const idToken = header.split(" ")[1];

    // Import firebase-admin lazily to avoid crashing if not configured
    let admin;
    try {
      admin = require("firebase-admin");
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        });
      }
    } catch (initErr) {
      console.error("Firebase admin init error:", initErr.message);
      return unauth(res, "Firebase not configured on server");
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    // Find or create user from Firebase UID
    let user = await prisma.user.findUnique({ where: { firebase_uid: decoded.uid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebase_uid: decoded.uid,
          email:        decoded.email || `${decoded.uid}@firebase.local`,
          name:         decoded.name || decoded.email?.split("@")[0] || "User",
          avatar_url:   decoded.picture || null,
          provider:     "google",
        },
      });
    }

    req.user = user;
    next();
  } catch (e) {
    console.error("Firebase verify error:", e.message);
    return unauth(res, "Invalid Firebase token");
  }
};

// Universal middleware — accepts both JWT and Firebase tokens
const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return unauth(res, "No token provided");

  const token = header.split(" ")[1];

  // Firebase tokens are long JWTs; our tokens are shorter
  // Try our JWT first, then Firebase
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { user_id: decoded.user_id } });
    if (!user) return unauth(res, "User not found");
    req.user = user;
    return next();
  } catch (jwtErr) {
    // Not our token — try Firebase
    return verifyFirebaseToken(req, res, next);
  }
};

module.exports = { auth, verifyJWT, verifyFirebaseToken };
