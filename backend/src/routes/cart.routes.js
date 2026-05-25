const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect); // all cart routes require auth

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.delete("/remove/:courseId", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);

module.exports = router;
