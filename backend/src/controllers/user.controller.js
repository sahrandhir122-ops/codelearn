const User = require("../models/User.model");
const Course = require("../models/Course.model");
const AppError = require("../utils/AppError");

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("enrolledCourses", "title slug thumbnail instructor rating totalStudents")
    .populate("watchHistory.course", "title slug thumbnail");

  res.json({ status: "success", data: { user } });
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  // Do NOT allow password update here (use /reset-password)
  if (req.body.password || req.body.passwordHash) {
    return next(new AppError("Use /api/auth/reset-password to change your password.", 400));
  }

  // Only include fields that were actually sent — prevents accidental
  // overwrites when the client only sends a subset of the profile.
  const allowed = ["name", "bio", "avatar"];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    return next(new AppError("No valid fields provided to update.", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.json({ status: "success", data: { user } });
};

// GET /api/users/watch-history
exports.getWatchHistory = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("watchHistory.course", "title slug thumbnail");

  res.json({ status: "success", data: { watchHistory: user.watchHistory } });
};

// POST /api/users/watch-history
exports.updateWatchHistory = async (req, res, next) => {
  const { courseId, lectureId, progress } = req.body;

  const user = await User.findById(req.user._id);
  const existing = user.watchHistory.find(
    (h) => h.course.toString() === courseId && h.lecture?.toString() === lectureId
  );

  if (existing) {
    existing.progress = progress;
    existing.watchedAt = new Date();
  } else {
    user.watchHistory.unshift({ course: courseId, lecture: lectureId, progress });
    // Keep history to last 50 entries
    if (user.watchHistory.length > 50) user.watchHistory = user.watchHistory.slice(0, 50);
  }

  await user.save({ validateBeforeSave: false });
  res.json({ status: "success", message: "Watch history updated." });
};

// POST /api/users/change-password
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return next(new AppError("Both current and new password are required.", 400));
  if (newPassword.length < 6)
    return next(new AppError("New password must be at least 6 characters.", 400));

  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!user.passwordHash)
    return next(new AppError("No password set for this account. Use Google/GitHub login.", 400));

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch)
    return next(new AppError("Current password is incorrect.", 401));

  user.passwordHash = newPassword; // pre-save hook will bcrypt-hash it
  await user.save();

  res.json({ status: "success", message: "Password changed successfully." });
};

// GET /api/users/enrolled-courses
exports.getEnrolledCourses = async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "enrolledCourses",
    select: "title slug thumbnail rating totalStudents sections",
    populate: { path: "instructor", select: "name" },
  });

  res.json({ status: "success", data: { courses: user.enrolledCourses } });
};
