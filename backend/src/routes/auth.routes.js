const express = require("express");
const passport = require("passport");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");

// ── Email / password ───────────────────────────────────────────────────────
router.post("/register", authLimiter, authController.register);
router.post("/verify-otp", otpLimiter, authController.verifyOTP);
router.post("/resend-otp", otpLimiter, authController.resendOTP);
router.post("/login", authLimiter, authController.login);
router.post("/logout", authController.logout);
router.get("/me", protect, authController.getMe);

// ── Password reset ─────────────────────────────────────────────────────────
router.post("/forgot-password", otpLimiter, authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// ── Google OAuth ───────────────────────────────────────────────────────────
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
  authController.oAuthCallback
);

// ── GitHub OAuth ───────────────────────────────────────────────────────────
router.get("/github", passport.authenticate("github", { scope: ["user:email"], session: false }));
router.get("/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
  authController.oAuthCallback
);

module.exports = router;
