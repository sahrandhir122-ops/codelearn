const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const watchHistorySchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  lecture: { type: mongoose.Schema.Types.ObjectId },
  watchedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 }, // percentage 0-100
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    passwordHash: {
      type: String,
      select: false,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["student", "admin", "instructor"],
      default: "student",
    },
    avatar: {
      type: String,
      default: function () {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=E8471A&color=fff`;
      },
    },
    bio: { type: String, maxlength: 300 },
    isVerified: { type: Boolean, default: false },
    otp: {
      code: String,
      expiresAt: Date,
    },
    social: {
      googleId: String,
      githubId: String,
      appleId: String,
    },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    watchHistory: [watchHistorySchema],
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save: hash password ────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Instance method: compare password ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ── Instance method: generate OTP ─────────────────────────────────────────
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Always cast to Number — process.env values are strings, so
  // Date.now() + "600000" would string-concatenate instead of adding.
  const expiresMs = Number(process.env.OTP_EXPIRES_IN) || 600000; // 10 min default
  this.otp = {
    code:      otp,
    expiresAt: new Date(Date.now() + expiresMs),
  };
  return otp;
};

// ── Instance method: verify OTP ───────────────────────────────────────────
userSchema.methods.verifyOTP = function (code) {
  if (!this.otp?.code || !this.otp?.expiresAt) return false;
  if (new Date(this.otp.expiresAt) < new Date()) return false;  // always wrap in Date()
  return this.otp.code === String(code).trim();                  // trim any whitespace
};

module.exports = mongoose.model("User", userSchema);
