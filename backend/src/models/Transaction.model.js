const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    // Razorpay fields
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },
    refundId: String,
    refundedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, course: 1 });
transactionSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
