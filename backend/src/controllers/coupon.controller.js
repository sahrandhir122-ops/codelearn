const Coupon = require("../models/Coupon.model");
const AppError = require("../utils/AppError");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/coupons   [Admin]
// ─────────────────────────────────────────────────────────────────────────────
exports.getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort("-createdAt");
  res.json({ status: "success", data: { coupons } });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/coupons   [Admin]
// ─────────────────────────────────────────────────────────────────────────────
exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ status: "success", data: { coupon } });
  } catch (err) {
    if (err.code === 11000)
      return next(new AppError("A coupon with that code already exists.", 400));
    return next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/coupons/:id   [Admin]
// ─────────────────────────────────────────────────────────────────────────────
exports.updateCoupon = async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!coupon) return next(new AppError("Coupon not found.", 404));
  res.json({ status: "success", data: { coupon } });
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/coupons/:id   [Admin]
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteCoupon = async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new AppError("Coupon not found.", 404));
  res.status(204).json({ status: "success", data: null });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/coupons/validate   [Authenticated]
// Body: { code, cartTotal, courseIds[] }
// ─────────────────────────────────────────────────────────────────────────────
exports.validateCoupon = async (req, res, next) => {
  const { code, cartTotal = 0, courseIds = [] } = req.body;
  if (!code) return next(new AppError("Coupon code is required.", 400));

  const coupon = await Coupon.findOne({
    code: code.toUpperCase().trim(),
    isActive: true,
  });
  if (!coupon) return next(new AppError("Invalid or inactive coupon code.", 400));

  // Expiry check
  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt))
    return next(new AppError("This coupon has expired.", 400));

  // Usage limit check
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit)
    return next(new AppError("This coupon has reached its usage limit.", 400));

  // Minimum purchase check
  if (Number(cartTotal) < coupon.minPurchase)
    return next(
      new AppError(
        `Minimum purchase of ₹${coupon.minPurchase} is required for this coupon.`,
        400
      )
    );

  // Course-specific restriction
  if (coupon.courses.length > 0 && courseIds.length > 0) {
    const couponCourseStrs = coupon.courses.map((c) => c.toString());
    const hasMatch = courseIds.some((id) => couponCourseStrs.includes(id));
    if (!hasMatch)
      return next(
        new AppError("This coupon is not valid for the selected course(s).", 400)
      );
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === "flat") {
    discount = coupon.discountValue;
  } else {
    discount = (Number(cartTotal) * coupon.discountValue) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.min(discount, Number(cartTotal)); // can't exceed cart total

  const finalAmount = Math.max(0, Number(cartTotal) - discount);

  res.json({
    status: "success",
    data: {
      coupon: {
        _id:           coupon._id,
        code:          coupon.code,
        discountType:  coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount:   coupon.maxDiscount,
        description:   coupon.description,
      },
      originalAmount: Number(cartTotal),
      discount,
      finalAmount,
    },
  });
};
