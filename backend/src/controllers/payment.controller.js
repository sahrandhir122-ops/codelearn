const crypto = require("crypto");
const Razorpay = require("razorpay");
const Course = require("../models/Course.model");
const Transaction = require("../models/Transaction.model");
const User = require("../models/User.model");
const AppError = require("../utils/AppError");
const {
  sendPurchaseConfirmationEmail,
  sendAdminPurchaseNotification,
} = require("../services/email.service");

// ── Mock mode: active when Razorpay keys are placeholder / missing ─────────
const PLACEHOLDER_KEY = "rzp_test_YOUR_KEY_ID";
const isMockMode = () =>
  !process.env.RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID === PLACEHOLDER_KEY ||
  !process.env.RAZORPAY_KEY_SECRET ||
  process.env.RAZORPAY_KEY_SECRET === "YOUR_RAZORPAY_KEY_SECRET";

// ── Initialize Razorpay (only in live mode) ────────────────────────────────
const getRazorpay = () => {
  if (isMockMode()) return null; // handled separately
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order   (single course)
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res, next) => {
  const { courseId } = req.body;
  if (!courseId) return next(new AppError("courseId is required.", 400));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("Course not found.", 404));

  // Check if already enrolled
  const alreadyEnrolled = req.user.enrolledCourses.some(
    (id) => id.toString() === courseId
  );
  if (alreadyEnrolled)
    return next(new AppError("Already enrolled in this course.", 400));

  const amountPaise = Math.round(course.price * 100);

  // ── Mock Mode ───────────────────────────────────────────────────────────
  if (isMockMode()) {
    const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await Transaction.create({
      user: req.user._id,
      course: course._id,
      amount: course.price,
      currency: "INR",
      razorpayOrderId: mockOrderId,
      status: "pending",
    });
    return res.json({
      status: "success",
      data: {
        orderId:     mockOrderId,
        amount:      amountPaise,
        currency:    "INR",
        keyId:       "mock_key",
        mockMode:    true,
        courseName:  course.title,
      },
    });
  }

  // ── Live Mode ────────────────────────────────────────────────────────────
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
    notes: {
      courseId:   course._id.toString(),
      userId:     req.user._id.toString(),
      courseName: course.title,
    },
  });

  await Transaction.create({
    user:            req.user._id,
    course:          course._id,
    amount:          course.price,
    currency:        "INR",
    razorpayOrderId: order.id,
    status:          "pending",
  });

  res.json({
    status: "success",
    data: {
      orderId:    order.id,
      amount:     amountPaise,
      currency:   "INR",
      keyId:      process.env.RAZORPAY_KEY_ID,
      courseName: course.title,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/cart-checkout  (multiple courses)
// ─────────────────────────────────────────────────────────────────────────────
exports.cartCheckout = async (req, res, next) => {
  const { courseIds } = req.body;
  if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0)
    return next(new AppError("courseIds array is required.", 400));

  // Filter out already-enrolled courses
  const toEnroll = courseIds.filter(
    (id) => !req.user.enrolledCourses.some((eid) => eid.toString() === id)
  );
  if (toEnroll.length === 0)
    return next(new AppError("Already enrolled in all selected courses.", 400));

  // Accept both published and unpublished courses (allow admin to test)
  const courses = await Course.find({ _id: { $in: toEnroll } });
  if (courses.length === 0)
    return next(new AppError("No valid courses found.", 404));

  const totalAmount = courses.reduce((sum, c) => sum + c.price, 0);
  const amountPaise = Math.round(totalAmount * 100);

  // ── Mock Mode ────────────────────────────────────────────────────────────
  if (isMockMode()) {
    const mockOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await Promise.all(
      courses.map((course) =>
        Transaction.create({
          user:            req.user._id,
          course:          course._id,
          amount:          course.price,
          currency:        "INR",
          razorpayOrderId: mockOrderId,
          status:          "pending",
        })
      )
    );
    return res.json({
      status: "success",
      data: {
        orderId:     mockOrderId,
        amount:      amountPaise,
        currency:    "INR",
        keyId:       "mock_key",
        mockMode:    true,
        courses:     courses.map((c) => ({
          _id:       c._id,
          title:     c.title,
          price:     c.price,
          thumbnail: c.thumbnail,
        })),
        totalAmount,
      },
    });
  }

  // ── Live Mode ────────────────────────────────────────────────────────────
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount:   amountPaise,
    currency: "INR",
    receipt:  `cart_${Date.now()}`,
    notes: {
      courseIds: toEnroll.join(","),
      userId:    req.user._id.toString(),
      type:      "cart",
    },
  });

  await Promise.all(
    courses.map((course) =>
      Transaction.create({
        user:            req.user._id,
        course:          course._id,
        amount:          course.price,
        currency:        "INR",
        razorpayOrderId: order.id,
        status:          "pending",
      })
    )
  );

  res.json({
    status: "success",
    data: {
      orderId:     order.id,
      amount:      amountPaise,
      currency:    "INR",
      keyId:       process.env.RAZORPAY_KEY_ID,
      courses:     courses.map((c) => ({
        _id:       c._id,
        title:     c.title,
        price:     c.price,
        thumbnail: c.thumbnail,
      })),
      totalAmount,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res, next) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)
    return next(new AppError("All payment fields are required.", 400));

  // ── Mock Mode: skip signature verification ────────────────────────────────
  const isMock = razorpayOrderId.startsWith("mock_order_");
  if (!isMock) {
    // Verify HMAC signature (live mode only)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature)
      return next(new AppError("Payment verification failed. Invalid signature.", 400));
  }

  // Find all transactions with this order ID
  const transactions = await Transaction.find({
    razorpayOrderId,
    status: "pending",
  }).populate("course");

  if (!transactions || transactions.length === 0)
    return next(new AppError("Transaction(s) not found.", 404));

  // Mark all as success and enroll user
  const courseIds = [];
  for (const txn of transactions) {
    txn.status           = "success";
    txn.razorpayPaymentId = razorpayPaymentId;
    txn.razorpaySignature = razorpaySignature;
    await txn.save();
    courseIds.push(txn.course._id);
  }

  // Enroll in all courses
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { enrolledCourses: { $each: courseIds } },
  });

  // Increment totalStudents for each course
  await Course.updateMany(
    { _id: { $in: courseIds } },
    { $inc: { totalStudents: 1 } }
  );

  // Fetch updated user
  const updatedUser = await User.findById(req.user._id).select("-passwordHash -otp");

  // Send emails (non-blocking, skip in mock mode)
  if (!isMock) {
    const emailPromises = transactions.map((txn) =>
      sendPurchaseConfirmationEmail(updatedUser, txn.course, txn).catch((err) =>
        console.error("Purchase email failed:", err.message)
      )
    );
    sendAdminPurchaseNotification(updatedUser, transactions).catch((err) =>
      console.error("Admin notification failed:", err.message)
    );
    await Promise.allSettled(emailPromises);
  }

  res.json({
    status:  "success",
    message: isMock ? "Test payment completed. You are now enrolled!" : "Payment verified. You are now enrolled!",
    data: {
      transactions,
      enrolledCourseIds: courseIds,
      mockMode: isMock,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/history
// ─────────────────────────────────────────────────────────────────────────────
exports.getPaymentHistory = async (req, res) => {
  const transactions = await Transaction.find({
    user:   req.user._id,
    status: "success",
  })
    .populate("course", "title thumbnail slug instructorName")
    .sort("-createdAt");

  res.json({ status: "success", data: { transactions } });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/admin/all   [Admin]
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllTransactions = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const [transactions, total, revenueAgg] = await Promise.all([
    Transaction.find(filter)
      .populate("user",   "name email")
      .populate("course", "title")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  res.json({
    status:        "success",
    total,
    totalRevenue:  revenueAgg[0]?.total || 0,
    data:          { transactions },
  });
};
