require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const passport = require("passport");
const path = require("path");

const connectDB = require("./config/db");
const connectRedis = require("./config/redis");
const { globalErrorHandler, notFound } = require("./middleware/errorHandler");

// Routes
const authRoutes    = require("./routes/auth.routes");
const courseRoutes  = require("./routes/course.routes");
const paymentRoutes = require("./routes/payment.routes");
const cartRoutes    = require("./routes/cart.routes");
const userRoutes    = require("./routes/user.routes");
const commentRoutes = require("./routes/comment.routes");
const adminRoutes   = require("./routes/admin.routes");
const couponRoutes  = require("./routes/coupon.routes");
const uploadRoutes  = require("./routes/upload.routes");
const videoRoutes   = require("./routes/video.routes");

// Passport config
require("./config/passport");

const app = express();

// ── Trust proxy (required for Render / cloud deployments) ─────────────────
// Fixes express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR warning
app.set("trust proxy", 1);

// ── Connect databases ──────────────────────────────────────────────────────
connectDB();
connectRedis();

// ── Serve uploaded files (videos, thumbnails) ──────────────────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// ── Security middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);
app.use(mongoSanitize());

// ── General middleware ─────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/courses",  courseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cart",     cartRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/coupons",  couponRoutes);
app.use("/api/upload",   uploadRoutes);
app.use("/api/videos",  videoRoutes);

// ── Error handling ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CodeLearn API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
