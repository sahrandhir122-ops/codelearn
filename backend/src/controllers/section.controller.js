const Course = require("../models/Course.model");
const AppError = require("../utils/AppError");

// helper – check ownership (admin can do anything, instructor only owns courses)
const canEdit = (req, course) =>
  req.user.role === "admin" ||
  course.instructor.toString() === req.user._id.toString();

// ── GET /api/courses/:id/builder ───────────────────────────────────────────
exports.getCourseForBuilder = async (req, res, next) => {
  const course = await Course.findById(req.params.id)
    .populate("instructor", "name email");
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));
  res.json({ status: "success", data: { course } });
};

// ── POST /api/courses/:id/sections ────────────────────────────────────────
exports.addSection = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));

  const { title } = req.body;
  if (!title?.trim()) return next(new AppError("Section title is required.", 400));

  course.sections.push({ title: title.trim(), order: course.sections.length, lectures: [] });
  await course.save();
  res.status(201).json({ status: "success", data: { sections: course.sections } });
};

// ── PUT /api/courses/:id/sections/:sid ────────────────────────────────────
exports.updateSection = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));

  const section = course.sections.id(req.params.sid);
  if (!section) return next(new AppError("Section not found.", 404));

  if (req.body.title !== undefined) section.title = req.body.title;
  if (req.body.order !== undefined) section.order = req.body.order;
  await course.save();
  res.json({ status: "success", data: { sections: course.sections } });
};

// ── DELETE /api/courses/:id/sections/:sid ─────────────────────────────────
exports.deleteSection = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));

  const section = course.sections.id(req.params.sid);
  if (!section) return next(new AppError("Section not found.", 404));

  section.deleteOne();
  await course.save();
  res.json({ status: "success", data: { sections: course.sections } });
};

// ── POST /api/courses/:id/sections/:sid/lectures ──────────────────────────
exports.addLecture = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));

  const section = course.sections.id(req.params.sid);
  if (!section) return next(new AppError("Section not found.", 404));

  const { title, description, videoUrl, duration, isFree } = req.body;
  if (!title?.trim()) return next(new AppError("Lecture title is required.", 400));

  section.lectures.push({
    title:       title.trim(),
    description: description || "",
    videoUrl:    videoUrl    || "",
    duration:    Number(duration) || 0,
    isFree:      Boolean(isFree),
    order:       section.lectures.length,
  });
  await course.save();
  res.status(201).json({ status: "success", data: { sections: course.sections } });
};

// ── PUT /api/courses/:id/sections/:sid/lectures/:lid ─────────────────────
exports.updateLecture = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));

  const section = course.sections.id(req.params.sid);
  if (!section) return next(new AppError("Section not found.", 404));

  const lecture = section.lectures.id(req.params.lid);
  if (!lecture) return next(new AppError("Lecture not found.", 404));

  ["title","description","videoUrl","duration","isFree","order"].forEach((f) => {
    if (req.body[f] !== undefined) lecture[f] = req.body[f];
  });
  await course.save();
  res.json({ status: "success", data: { sections: course.sections } });
};

// ── DELETE /api/courses/:id/sections/:sid/lectures/:lid ───────────────────
exports.deleteLecture = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  if (!canEdit(req, course)) return next(new AppError("Not authorised.", 403));

  const section = course.sections.id(req.params.sid);
  if (!section) return next(new AppError("Section not found.", 404));

  const lecture = section.lectures.id(req.params.lid);
  if (!lecture) return next(new AppError("Lecture not found.", 404));

  lecture.deleteOne();
  await course.save();
  res.json({ status: "success", data: { sections: course.sections } });
};
