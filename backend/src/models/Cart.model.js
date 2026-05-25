const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  addedAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,   // one cart per user
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

// Convenience virtual: total price
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((sum, item) => {
    return sum + (item.course?.price || 0);
  }, 0);
});

module.exports = mongoose.model("Cart", cartSchema);
