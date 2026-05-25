const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.get("/watch-history", userController.getWatchHistory);
router.post("/watch-history", userController.updateWatchHistory);
router.get("/enrolled-courses", userController.getEnrolledCourses);

module.exports = router;
