const express = require("express");
const router = express.Router();

const courseController  = require("../controllers/course.controller");
const sectionController = require("../controllers/section.controller");
const { protect, restrictTo, optionalAuth } = require("../middleware/auth.middleware");
const { apiLimiter } = require("../middleware/rateLimiter");

router.use(apiLimiter);

router.get("/", optionalAuth, courseController.getAllCourses);
router.get("/:slug", optionalAuth, courseController.getCourse);

// Enrolled only
router.get("/:id/lectures", protect, courseController.getCourseLectures);
router.post("/:id/review", protect, restrictTo("student"), courseController.addReview);

// Admin / Instructor — course CRUD
router.post("/", protect, restrictTo("admin", "instructor"), courseController.createCourse);
router.put("/:id", protect, restrictTo("admin", "instructor"), courseController.updateCourse);
router.delete("/:id", protect, restrictTo("admin"), courseController.deleteCourse);
router.post("/:id/publish", protect, restrictTo("admin"), courseController.togglePublish);

// ── Course Builder (sections & lectures) ───────────────────────────────────
router.get("/:id/builder", protect, restrictTo("admin", "instructor"), sectionController.getCourseForBuilder);

// Sections
router.post("/:id/sections",        protect, restrictTo("admin", "instructor"), sectionController.addSection);
router.put("/:id/sections/:sid",    protect, restrictTo("admin", "instructor"), sectionController.updateSection);
router.delete("/:id/sections/:sid", protect, restrictTo("admin", "instructor"), sectionController.deleteSection);

// Lectures
router.post("/:id/sections/:sid/lectures",        protect, restrictTo("admin", "instructor"), sectionController.addLecture);
router.put("/:id/sections/:sid/lectures/:lid",    protect, restrictTo("admin", "instructor"), sectionController.updateLecture);
router.delete("/:id/sections/:sid/lectures/:lid", protect, restrictTo("admin", "instructor"), sectionController.deleteLecture);

// Lecture Resources (ZIP / PDF / etc.)
router.post("/:id/sections/:sid/lectures/:lid/resources",        protect, restrictTo("admin", "instructor"), sectionController.addResource);
router.delete("/:id/sections/:sid/lectures/:lid/resources/:rid", protect, restrictTo("admin", "instructor"), sectionController.deleteResource);

module.exports = router;
