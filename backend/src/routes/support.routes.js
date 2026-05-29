const express = require("express");
const router  = express.Router();
const supportController = require("../controllers/support.controller");
const { apiLimiter } = require("../middleware/rateLimiter");

// Rate-limit chat to 30 req/15min per IP to control API costs
router.use(apiLimiter);

router.post("/chat", supportController.chat);

module.exports = router;
