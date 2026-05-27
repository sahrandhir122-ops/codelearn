const express = require("express");
const router  = express.Router();
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { uploadVideo, uploadThumb, uploadAvatar, uploadResource } = require("../middleware/upload");
const uploadController = require("../controllers/upload.controller");

// ── Avatar upload (any logged-in user) ────────────────────────────────────
router.post("/avatar",
  protect,
  uploadAvatar.single("avatar"),
  uploadController.uploadAvatar
);

// ── Admin / Instructor only ────────────────────────────────────────────────
router.use(protect, restrictTo("admin", "instructor"));

router.post("/video",      uploadVideo.single("video"),           uploadController.uploadVideo);
router.post("/thumbnail",  uploadThumb.single("thumbnail"),        uploadController.uploadThumbnail);
router.post("/resource",   uploadResource.single("file"),          uploadController.uploadResource);

// Delete (body: { publicId } or { url })
router.delete("/video",    uploadController.deleteVideo);
router.delete("/image",    uploadController.deleteImage);

// Legacy route kept for backward compat
router.delete("/video/:filename", uploadController.deleteVideo);

module.exports = router;
