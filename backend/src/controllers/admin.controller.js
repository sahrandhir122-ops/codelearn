const User = require("../models/User.model");
const Course = require("../models/Course.model");
const Transaction = require("../models/Transaction.model");
const Comment = require("../models/Comment.model");

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
