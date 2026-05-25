const Course = require("../models/Course.model");
const User = require("../models/User.model");
const AppError = require("../utils/AppError");

// GET /api/courses
exports.getAllCourses = async (req, res) => {
  const { category, level, search, sort, page = 1, limit = 12 } = req.query;

  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (search) filter.$text = { $search: search };

  const sortMap = {
    newest: "-createdAt",
    popular: "-totalStudents",
    rating: "-rating",
    "price-low": "price",
    "price-high": "-price",
  };
  const sortBy = sortMap[sort] || "-createdAt";

  const skip = (page - 1) * limit;
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit))
      .select("-sections.lectures.videoUrl")
      .populate("instructor", "name avatar"),
    Course.countDocuments(filter),
  ]);

  res.json({
    status: "success",
    results: courses.length,
    total,
    pages: Math.ceil(total / limit),
    data: { courses },
  });
};

// GET /api/courses/:slug
exports.getCourse = async (req, res, next) => {
  const course = await Course.findOne({ slug: req.params.slug, isPublished: true })
    .populate("instructor", "name avatar bio")
    .populate("reviews.user", "name avatar");

  if (!course) return next(new AppError("Course not found.", 404));

  // Determine whether the caller has full access to all video URLs
  const isAdmin = req.user?.role === "admin";

  // ⚠️  Must use .toString() — Mongoose ObjectIds are objects, not primitives,
  //     so Array.includes() (===) always returns false for them.
  const isOwner = req.user &&
    course.instructor._id?.toString() === req.user._id.toString();

  const isEnrolled = req.user?.enrolledCourses?.some(
    (id) => id.toString() === course._id.toString()
  );

  const hasFullAccess = isEnrolled || isAdmin || isOwner;

  // Strip videoUrls from paid lectures for users without full access.
  // Free lectures always keep their videoUrl so the preview modal works.
  const sanitized = course.toObject();
  if (!hasFullAccess) {
    sanitized.sections.forEach((section) => {
      section.lectures.forEach((lecture) => {
        if (!lecture.isFree) lecture.videoUrl = null;
      });
    });
  }

  res.json({ status: "success", data: { course: sanitized } });
};

// POST /api/courses  [Admin/Instructor]
exports.createCourse = async (req, res, next) => {
  const course = await Course.create({
    ...req.body,
    instructor: req.user._id,
    instructorName: req.user.name,
  });
  res.status(201).json({ status: "success", data: { course } });
};

// PUT /api/courses/:id  [Admin/Instructor]
exports.updateCourse = async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!course) return next(new AppError("Course not found.", 404));
  res.json({ status: "success", data: { course } });
};

// DELETE /api/courses/:id  [Admin]
exports.deleteCourse = async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  res.status(204).json({ status: "success", data: null });
};

// POST /api/courses/:id/publish  [Admin]
exports.togglePublish = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));
  course.isPublished = !course.isPublished;
  await course.save();
  res.json({ status: "success", data: { course } });
};

// POST /api/courses/:id/review  [Student]
exports.addReview = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));

  const enrolled = req.user.enrolledCourses.some(
    (id) => id.toString() === course._id.toString()
  );
  if (!enrolled) return next(new AppError("Purchase this course to leave a review.", 403));

  const existing = course.reviews.find((r) => r.user.toString() === req.user._id.toString());
  if (existing) {
    existing.rating = req.body.rating;
    existing.comment = req.body.comment;
  } else {
    course.reviews.push({ user: req.user._id, rating: req.body.rating, comment: req.body.comment });
  }

  course.calcAverageRating();
  await course.save();

  res.json({ status: "success", data: { course } });
};

// GET /api/courses/:id/lectures  [Enrolled]
exports.getCourseLectures = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError("Course not found.", 404));

  // Admins and instructors can always view lectures (for preview/testing)
  const isPrivileged = ["admin", "instructor"].includes(req.user.role);
  const enrolled = req.user.enrolledCourses.some(
    (id) => id.toString() === course._id.toString()
  );

  if (!enrolled && !isPrivileged) {
    return next(new AppError("Enroll in this course to access lectures.", 403));
  }

  res.json({ status: "success", data: { title: course.title, sections: course.sections } });
};
