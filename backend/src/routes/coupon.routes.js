const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Validate — any authenticated user
router.post("/validate", protect, couponController.validateCoupon);

// Admin-only CRUD
router.use(protect, restrictTo("admin"));
router.get("/", couponController.getCoupons);
router.post("/", couponController.createCoupon);
router.patch("/:id", couponController.updateCoupon);
router.delete("/:id", couponController.deleteCoupon);

module.exports = router;
