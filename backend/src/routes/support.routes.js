const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/support.controller");
const { protect, restrictTo, optionalAuth } = require("../middleware/auth.middleware");
const { apiLimiter } = require("../middleware/rateLimiter");

router.use(apiLimiter);

// ── User / guest ───────────────────────────────────────────────────────────
router.post("/chat",          optionalAuth, ctrl.chat);
router.get("/ticket/:id",                  ctrl.getTicket);

// ── Admin ──────────────────────────────────────────────────────────────────
router.get("/admin/tickets",               protect, restrictTo("admin"), ctrl.getAllTickets);
router.get("/admin/tickets/:id",           protect, restrictTo("admin"), ctrl.getTicketAdmin);
router.post("/admin/tickets/:id/reply",    protect, restrictTo("admin"), ctrl.adminReply);
router.patch("/admin/tickets/:id/status",  protect, restrictTo("admin"), ctrl.updateStatus);

module.exports = router;
