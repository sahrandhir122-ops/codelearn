const Cart = require("../models/Cart.model");
const Course = require("../models/Course.model");
const AppError = require("../utils/AppError");

// ── Helper: get or create cart ─────────────────────────────────────────────
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate(
    "items.course",
    "title slug thumbnail price originalPrice instructorName rating level isPublished"
  );
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

// GET /api/cart
exports.getCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);

  // Filter out unpublished / deleted courses
  cart.items = cart.items.filter((item) => item.course && item.course.isPublished);

  // Exclude courses the user is already enrolled in
  cart.items = cart.items.filter(
    (item) =>
      !req.user.enrolledCourses.some(
        (id) => id.toString() === item.course._id.toString()
      )
  );

  const totalPrice = cart.items.reduce(
    (sum, item) => sum + (item.course?.price || 0),
    0
  );
  const totalOriginalPrice = cart.items.reduce(
    (sum, item) => sum + (item.course?.originalPrice || 0),
    0
  );

  res.json({
    status: "success",
    data: {
      items: cart.items,
      totalPrice,
      totalOriginalPrice,
      savings: totalOriginalPrice - totalPrice,
      count: cart.items.length,
    },
  });
};

// POST /api/cart/add
exports.addToCart = async (req, res, next) => {
  const { courseId } = req.body;
  if (!courseId) return next(new AppError("courseId is required.", 400));

  const course = await Course.findById(courseId);
  if (!course || !course.isPublished)
    return next(new AppError("Course not found.", 404));

  // Already enrolled?
  if (
    req.user.enrolledCourses.some((id) => id.toString() === courseId)
  ) {
    return next(new AppError("You are already enrolled in this course.", 400));
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  // Already in cart?
  const alreadyInCart = cart.items.some(
    (item) => item.course.toString() === courseId
  );
  if (alreadyInCart)
    return next(new AppError("Course is already in your cart.", 400));

  cart.items.push({ course: courseId });
  await cart.save();

  res.json({ status: "success", message: "Course added to cart.", count: cart.items.length });
};

// DELETE /api/cart/remove/:courseId
exports.removeFromCart = async (req, res, next) => {
  const { courseId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(new AppError("Cart not found.", 404));

  const before = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.course.toString() !== courseId
  );

  if (cart.items.length === before)
    return next(new AppError("Course not found in cart.", 404));

  await cart.save();
  res.json({ status: "success", message: "Course removed from cart.", count: cart.items.length });
};

// DELETE /api/cart/clear
exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ status: "success", message: "Cart cleared." });
};
