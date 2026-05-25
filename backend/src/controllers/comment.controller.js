const Comment = require("../models/Comment.model");
const AppError = require("../utils/AppError");

// GET /api/comments/:courseId
exports.getCourseComments = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const comments = await Comment.find({
    course: req.params.courseId,
    isDeleted: false,
    isModerated: false,
  })
    .populate("user", "name avatar")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Comment.countDocuments({ course: req.params.courseId, isDeleted: false, isModerated: false });

  res.json({ status: "success", total, data: { comments } });
};

// POST /api/comments/:courseId
exports.postComment = async (req, res, next) => {
  const comment = await Comment.create({
    course: req.params.courseId,
    user: req.user._id,
    text: req.body.text,
  });

  await comment.populate("user", "name avatar");

  res.status(201).json({ status: "success", data: { comment } });
};

// DELETE /api/comments/:id
exports.deleteComment = async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return next(new AppError("Comment not found.", 404));

  const isOwner = comment.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return next(new AppError("You do not have permission to delete this comment.", 403));
  }

  comment.isDeleted = true;
  await comment.save();

  res.status(204).json({ status: "success", data: null });
};

// PUT /api/comments/:id/moderate  [Admin]
exports.moderateComment = async (req, res, next) => {
  const comment = await Comment.findByIdAndUpdate(
    req.params.id,
    { isModerated: req.body.isModerated, moderatedBy: req.user._id, moderatedAt: new Date() },
    { new: true }
  );
  if (!comment) return next(new AppError("Comment not found.", 404));
  res.json({ status: "success", data: { comment } });
};

// POST /api/comments/:id/like
exports.toggleLike = async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return next(new AppError("Comment not found.", 404));

  const idx = comment.likes.indexOf(req.user._id);
  if (idx === -1) {
    comment.likes.push(req.user._id);
  } else {
    comment.likes.splice(idx, 1);
  }
  await comment.save();

  res.json({ status: "success", data: { likes: comment.likes.length } });
};
