const Anthropic      = require("@anthropic-ai/sdk");
const AppError       = require("../utils/AppError");
const SupportTicket  = require("../models/SupportTicket.model");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are CodeLearn's friendly AI support assistant. CodeLearn is India's premier online coding education platform.

ABOUT CODELEARN:
- Courses in Python, Web Development, AI/ML, Data Science, DevOps, Mobile Dev, and more
- Payments via Razorpay (UPI, cards, net banking) — prices start at ₹999
- After purchase students access courses via "My Learning" / Dashboard
- Free preview lectures are available on some courses
- Certificates awarded on course completion
- Admin can grant free access to specific users

HELP TOPICS:
1. Payment — Razorpay failures, refunds, order not showing up
2. Course access — enrolled course missing, enroll button issues
3. Video playback — not loading, buffering, black screen
4. Account — login issues, forgot password, OTP not received
5. Certificate — how to get it, progress tracking
6. Navigation — finding lectures, mark as done, resume
7. Technical — browser issues, mobile, downloads

GUIDELINES:
- Be warm, helpful, and concise (2-4 sentences)
- For unresolved issues say: "I've logged your issue and our support team will review it shortly. You can also email support@codelearn.in."
- Never fabricate course names, prices, or policies you're unsure about
- Stay focused on CodeLearn topics only`;

// ── POST /api/support/chat ─────────────────────────────────────────────────
// Creates a new ticket or continues existing one
exports.chat = async (req, res, next) => {
  const { message, ticketId, guestEmail, guestName } = req.body;
  if (!message?.trim()) return next(new AppError("Message is required.", 400));

  // Find or create ticket
  let ticket;
  if (ticketId) {
    ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return next(new AppError("Ticket not found.", 404));
  } else {
    ticket = new SupportTicket({
      user:       req.user?._id  || null,
      guestEmail: guestEmail     || req.user?.email || null,
      guestName:  guestName      || req.user?.name  || null,
      messages:   [],
    });
  }

  // Save user message
  ticket.messages.push({ role: "user", content: message.trim(), isAI: false });
  ticket.lastMessageAt = new Date();
  ticket.adminRead     = false; // mark unread for admin

  let aiReply = null;

  // Only call AI if key is configured
  if (process.env.ANTHROPIC_API_KEY) {
    const recent = ticket.messages.slice(-12);
    const msgs   = recent.map(m => ({
      role:    m.role === "admin" ? "assistant" : m.role,
      content: m.content,
    }));

    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:     SYSTEM_PROMPT,
      messages:   msgs,
    });

    aiReply = response.content[0]?.text || "Sorry, I couldn't process that. Please email support@codelearn.in.";
    ticket.messages.push({ role: "assistant", content: aiReply, isAI: true });
  }

  await ticket.save();

  res.json({
    status: "success",
    data: {
      reply:    aiReply,
      ticketId: ticket._id.toString(),
    },
  });
};

// ── GET /api/support/ticket/:id ────────────────────────────────────────────
// User loads their existing ticket
exports.getTicket = async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate("user", "name email avatar");
  if (!ticket) return next(new AppError("Ticket not found.", 404));
  res.json({ status: "success", data: { ticket } });
};

// ── GET /api/support/admin/tickets ────────────────────────────────────────
exports.getAllTickets = async (req, res, next) => {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = status ? { status } : {};

  const [tickets, total, unreadCount] = await Promise.all([
    SupportTicket.find(filter)
      .populate("user", "name email avatar")
      .sort("-lastMessageAt")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    SupportTicket.countDocuments(filter),
    SupportTicket.countDocuments({ adminRead: false, status: { $ne: "resolved" } }),
  ]);

  res.json({ status: "success", total, unreadCount, data: { tickets } });
};

// ── GET /api/support/admin/tickets/:id ───────────────────────────────────
exports.getTicketAdmin = async (req, res, next) => {
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { adminRead: true },
    { new: true }
  ).populate("user", "name email avatar");

  if (!ticket) return next(new AppError("Ticket not found.", 404));
  res.json({ status: "success", data: { ticket } });
};

// ── POST /api/support/admin/tickets/:id/reply ────────────────────────────
exports.adminReply = async (req, res, next) => {
  const { message } = req.body;
  if (!message?.trim()) return next(new AppError("Message is required.", 400));

  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return next(new AppError("Ticket not found.", 404));

  ticket.messages.push({
    role:      "admin",
    content:   message.trim(),
    isAI:      false,
    adminName: req.user?.name || "Support Team",
  });
  ticket.status        = "in_progress";
  ticket.lastMessageAt = new Date();
  await ticket.save();

  const populated = await ticket.populate("user", "name email avatar");
  res.json({ status: "success", data: { ticket: populated } });
};

// ── PATCH /api/support/admin/tickets/:id/status ──────────────────────────
exports.updateStatus = async (req, res, next) => {
  const { status } = req.body;
  if (!["open", "in_progress", "resolved"].includes(status))
    return next(new AppError("Invalid status.", 400));

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate("user", "name email avatar");

  if (!ticket) return next(new AppError("Ticket not found.", 404));
  res.json({ status: "success", data: { ticket } });
};
