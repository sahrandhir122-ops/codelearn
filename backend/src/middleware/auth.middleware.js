const passport = require("passport");
const AppError = require("../utils/AppError");

// ── Protect: require valid JWT ─────────────────────────────────────────────
const protect = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return next(new AppError("Not authenticated. Please sign in.", 401));
    if (!user.isVerified) return next(new AppError("Please verify your email first.", 403));
    req.user = user;
    next();
  })(req, res, next);
};

// ── Restrict: role-based access ────────────────────────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError("You do not have permission to perform this action.", 403));
  }
  next();
};

// ── Optional auth (attach user if token present, don't block) ─────────────
const optionalAuth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

module.exports = { protect, restrictTo, optionalAuth };
