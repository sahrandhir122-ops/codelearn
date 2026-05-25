const User = require("../models/User.model");
const AppError = require("../utils/AppError");
const { createSendToken, signToken } = require("../utils/jwt");
const { sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail } = require("../services/email.service");

// POST /api/auth/register
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email already registered. Please sign in.", 400));
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    isVerified: false,
  });

  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Respond immediately — user sees the OTP page right away
  res.status(201).json({
    status: "success",
    message: "OTP sent to your email. Please verify to complete registration.",
  });

  // Send OTP email in background after responding
  sendOTPEmail(user, otp).catch((err) =>
    console.error("[register] OTP email failed:", err.message)
  );
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select("+otp");
  if (!user) return next(new AppError("User not found.", 404));
  if (user.isVerified) return next(new AppError("Email already verified.", 400));

  if (!user.verifyOTP(otp)) {
    return next(new AppError("Invalid or expired OTP. Please request a new one.", 400));
  }

  user.isVerified = true;
  user.otp = undefined;
  await user.save({ validateBeforeSave: false });

  // Send token immediately — welcome email goes in background
  createSendToken(user, 200, res);
  sendWelcomeEmail(user); // already fire-and-forget inside sendWelcomeEmail
};

// POST /api/auth/resend-otp
exports.resendOTP = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new AppError("User not found.", 404));
  if (user.isVerified) return next(new AppError("Email already verified.", 400));

  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Respond immediately — don't block on SMTP
  res.json({ status: "success", message: "New OTP sent to your email." });

  // Send email in background after responding
  sendOTPEmail(user, otp).catch((err) =>
    console.error("[resendOTP] Email failed:", err.message)
  );
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Please provide email and password.", 400));
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Incorrect email or password.", 401));
  }

  if (!user.isVerified) {
    return next(new AppError("Please verify your email before signing in.", 403));
  }

  createSendToken(user, 200, res);
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.cookie("token", "loggedout", {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
  });
  res.json({ status: "success", message: "Logged out successfully." });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate("enrolledCourses", "title slug thumbnail");
  res.json({ status: "success", data: { user } });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new AppError("No account found with that email address.", 404));

  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Respond immediately — don't block on SMTP
  res.json({ status: "success", message: "Password reset OTP sent to your email." });

  sendPasswordResetEmail(user, otp).catch((err) =>
    console.error("[forgotPassword] Email failed:", err.message)
  );
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return next(new AppError("Password must be at least 6 characters.", 400));
  }

  const user = await User.findOne({ email }).select("+otp +passwordHash");
  if (!user) return next(new AppError("User not found.", 404));

  if (!user.verifyOTP(otp)) {
    return next(new AppError("Invalid or expired OTP. Please request a new one.", 400));
  }

  user.passwordHash = newPassword;  // pre-save hook will hash it
  user.otp          = undefined;
  user.isVerified   = true;         // mark verified in case they weren't
  await user.save({ validateBeforeSave: false });

  // Log them in automatically after reset
  createSendToken(user, 200, res);
};

// OAuth callback handler (Google / GitHub)
// We pass the token in the redirect URL so the SPA can store it in localStorage
// just like a normal login — this avoids cross-origin cookie issues in dev
// where frontend (5173) and backend (5000) are different origins.
exports.oAuthCallback = async (req, res) => {
  const token = signToken(req.user._id);
  res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
};
