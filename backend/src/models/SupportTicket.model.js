const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role:    { type: String, enum: ["user", "assistant", "admin"], required: true },
    content: { type: String, required: true },
    isAI:    { type: Boolean, default: false },
    adminName: String,
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    guestEmail:    String,
    guestName:     String,
    status:        { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
    messages:      [messageSchema],
    lastMessageAt: { type: Date, default: Date.now },
    adminRead:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
