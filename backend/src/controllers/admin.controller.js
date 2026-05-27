const User = require("../models/User.model");
const Course = require("../models/Course.model");
const Transaction = require("../models/Transaction.model");
const Comment = require("../models/Comment.model");
const AppError = require("../utils/AppError");
const { sendAnnouncementEmail } = require("../services/email.service");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalStudents,
    totalCourses,
    revenueData,
    monthlyRevenue,
    yearlyRevenue,
    recentTransactions,
    topCourses,
    newUsersToday,
    newUsersThisMonth,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    Course.countDocuments({ isPublished: true }),
    Transaction.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    // This month's revenue
    Transaction.aggregate([
      { $match: { status: "success", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    // This year's revenue
    Transaction.aggregate([
      { $match: { status: "success", createdAt: { $gte: startOfYear } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.find({ status: "success" })
      .populate("user", "name email avatar")
      .populate("course", "title thumbnail")
      .sort("-createdAt")
      .limit(10),
    Course.find({ isPublished: true })
      .sort("-totalStudents")
      .limit(5)
      .select("title totalStudents rating thumbnail instructorName price"),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
  ]);

  res.json({
    status: "success",
    data: {
      totalStudents,
      totalCourses,
      totalRevenue: revenueData[0]?.total || 0,
      totalTransactions: revenueData[0]?.count || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      monthlyTransactions: monthlyRevenue[0]?.count || 0,
      yearlyRevenue: yearlyRevenue[0]?.total || 0,
      newUsersToday,
      newUsersThisMonth,
      recentTransactions,
      topCourses,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/revenue/daily   (last 30 days)
// ─────────────────────────────────────────────────────────────────────────────
exports.getDailyRevenue = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const data = await Transaction.aggregate([
    { $match: { status: "success", createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  // Format for charts: { date: "May 1", revenue: 1200, count: 3 }
  const formatted = data.map((d) => ({
    date: new Date(d._id.year, d._id.month - 1, d._id.day).toLocaleDateString(
      "en-IN",
      { month: "short", day: "numeric" }
    ),
    revenue: d.revenue,
    count: d.count,
  }));

  res.json({ status: "success", data: { daily: formatted } });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/revenue/monthly  (last 12 months)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMonthlyRevenue = async (req, res) => {
  const data = await Transaction.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 },
  ]);

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  const formatted = data.map((d) => ({
    month: `${months[d._id.month - 1]} ${d._id.year}`,
    revenue: d.revenue,
    count: d.count,
  }));

  res.json({ status: "success", data: { monthly: formatted } });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/revenue/yearly
// ─────────────────────────────────────────────────────────────────────────────
exports.getYearlyRevenue = async (req, res) => {
  const data = await Transaction.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" } },
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1 } },
  ]);

  const formatted = data.map((d) => ({
    year: String(d._id.year),
    revenue: d.revenue,
    count: d.count,
  }));

  res.json({ status: "success", data: { yearly: formatted } });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-passwordHash -otp"),
    User.countDocuments(filter),
  ]);

  res.json({ status: "success", total, data: { users } });
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/role
// ─────────────────────────────────────────────────────────────────────────────
exports.changeUserRole = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true, runValidators: true }
  ).select("-passwordHash -otp");
  res.json({ status: "success", data: { user } });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: "success", data: null });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/comments/pending
// ─────────────────────────────────────────────────────────────────────────────
exports.getPendingComments = async (req, res) => {
  const comments = await Comment.find({ isModerated: false, isDeleted: false })
    .populate("user", "name avatar")
    .populate("course", "title")
    .sort("-createdAt")
    .limit(50);
  res.json({ status: "success", data: { comments } });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reviews   (all reviews across all courses)
// ─────────────────────────────────────────────────────────────────────────────
exports.getReviews = async (req, res) => {
  const courses = await Course.find({ "reviews.0": { $exists: true } })
    .select("title reviews")
    .populate("reviews.user", "name avatar");

  const allReviews = [];
  courses.forEach((course) => {
    (course.reviews || []).forEach((rev) => {
      allReviews.push({
        _id:         rev._id,
        courseId:    course._id,
        courseTitle: course.title,
        user:        rev.user,
        rating:      rev.rating,
        comment:     rev.comment,
        createdAt:   rev.createdAt,
      });
    });
  });

  allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ status: "success", data: { reviews: allReviews } });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/reviews/:courseId/:reviewId
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteReview = async (req, res, next) => {
  const { courseId, reviewId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("Course not found.", 404));

  course.reviews.pull({ _id: reviewId });
  course.calcAverageRating();
  await course.save();

  res.status(204).json({ status: "success", data: null });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/announcements   — email all verified users
// Body: { subject, message }
// ─────────────────────────────────────────────────────────────────────────────
exports.sendAnnouncement = async (req, res, next) => {
  const { subject, message } = req.body;
  if (!subject?.trim() || !message?.trim())
    return next(new AppError("Subject and message are required.", 400));

  const users = await User.find({ isVerified: true }).select("email name").lean();

  // Fire-and-forget for every user — never block the response
  let queued = 0;
  for (const user of users) {
    sendAnnouncementEmail(user, subject.trim(), message.trim());
    queued++;
  }

  res.json({
    status:  "success",
    message: `Announcement queued for ${queued} users.`,
    data:    { userCount: queued },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id/enrollments
// ─────────────────────────────────────────────────────────────────────────────
exports.getUserEnrollments = async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select("name email enrolledCourses")
    .populate("enrolledCourses", "title thumbnail price slug");
  if (!user) return next(new AppError("User not found.", 404));
  res.json({ status: "success", data: { user: { name: user.name, email: user.email }, enrollments: user.enrolledCourses } });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/users/:id/grant-access
// Body: { courseId }
// ─────────────────────────────────────────────────────────────────────────────
exports.grantCourseAccess = async (req, res, next) => {
  const { courseId } = req.body;
  if (!courseId) return next(new AppError("courseId is required.", 400));

  const [user, course] = await Promise.all([
    User.findById(req.params.id),
    Course.findById(courseId).select("title"),
  ]);
  if (!user)   return next(new AppError("User not found.", 404));
  if (!course) return next(new AppError("Course not found.", 404));

  const alreadyEnrolled = user.enrolledCourses.some(
    (id) => id.toString() === courseId
  );
  if (!alreadyEnrolled) {
    user.enrolledCourses.push(courseId);
    await user.save();
  }

  res.json({
    status:  "success",
    message: alreadyEnrolled
      ? "User already has access."
      : `Access granted to "${course.title}".`,
    data: { alreadyEnrolled },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id/revoke-access/:courseId
// ─────────────────────────────────────────────────────────────────────────────
exports.revokeCourseAccess = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found.", 404));

  const before = user.enrolledCourses.length;
  user.enrolledCourses = user.enrolledCourses.filter(
    (id) => id.toString() !== req.params.courseId
  );
  if (user.enrolledCourses.length === before)
    return next(new AppError("User is not enrolled in this course.", 404));

  await user.save();
  res.json({ status: "success", message: "Access revoked." });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/courses  (all courses including drafts)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllCourses = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  // Build filter — use regex for search (no text-index dependency)
  const filter = {};
  if (search && search.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: re }, { instructorName: re }, { category: re }];
  }

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .sort("-createdAt")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("instructor", "name email")
      .select("-sections"),
    Course.countDocuments(filter),
  ]);

  res.json({ status: "success", total, data: { courses } });
};
