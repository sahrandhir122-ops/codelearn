const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// All admin routes require admin role
router.use(protect, restrictTo("admin"));

// Dashboard
router.get("/stats", adminController.getDashboardStats);

// Users
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", adminController.changeUserRole);
router.delete("/users/:id", adminController.deleteUser);

// Free-access grants
router.get("/users/:id/enrollments",              adminController.getUserEnrollments);
router.post("/users/:id/grant-access",            adminController.grantCourseAccess);
router.delete("/users/:id/revoke-access/:courseId", adminController.revokeCourseAccess);

// Courses (all, including drafts)
router.get("/courses", adminController.getAllCourses);

// Comments
router.get("/comments/pending", adminController.getPendingComments);

// Revenue analytics
router.get("/revenue/daily", adminController.getDailyRevenue);
router.get("/revenue/monthly", adminController.getMonthlyRevenue);
router.get("/revenue/yearly", adminController.getYearlyRevenue);

// Reviews
router.get("/reviews", adminController.getReviews);
router.delete("/reviews/:courseId/:reviewId", adminController.deleteReview);

// Announcements
router.post("/announcements", adminController.sendAnnouncement);

module.exports = router;
