const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// All payment routes require authentication
router.use(protect);

router.post("/create-order", paymentController.createOrder);       // single course
router.post("/cart-checkout", paymentController.cartCheckout);     // multiple courses (cart)
router.post("/verify", paymentController.verifyPayment);           // verify & enroll
router.get("/history", paymentController.getPaymentHistory);       // student history

// Admin only
router.get("/admin/all", restrictTo("admin"), paymentController.getAllTransactions);

module.exports = router;
