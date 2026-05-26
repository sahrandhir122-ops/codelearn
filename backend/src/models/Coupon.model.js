const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType:  { type: String, enum: ["percentage", "flat"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minPurchase:   { type: Number, default: 0 },
    maxDiscount:   { type: Number },        // cap for percentage coupons
    expiresAt:     { type: Date },
    usageLimit:    { type: Number, default: 0 }, // 0 = unlimited
    usedCount:     { type: Number, default: 0 },
    isActive:      { type: Boolean, default: true },
    // empty array = valid on all courses; non-empty = specific courses only
    courses:       [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    description:   { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1 });

module.exports = mongoose.model("Coupon", couponSchema);
