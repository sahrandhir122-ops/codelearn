const express = require("express");
const router = express.Router();
const commentController = require("../controllers/comment.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.get("/:courseId", commentController.getCourseComments);
router.post("/:courseId", protect, commentController.postComment);
router.delete("/:id", protect, commentController.deleteComment);
router.put("/:id/moderate", protect, restrictTo("admin"), commentController.moderateComment);
router.post("/:id/like", protect, commentController.toggleLike);

module.exports = router;
