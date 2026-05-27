const multer  = require("multer");
// Use memory storage — files are buffered in RAM, then streamed to Cloudinary
// This avoids multer-storage-cloudinary v2 compatibility issues entirely

const videoFilter = (req, file, cb) => {
  const allowed = [
    "video/mp4", "video/webm", "video/ogg",
    "video/mpeg", "video/quicktime", "video/x-msvideo",
    "video/x-matroska",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only video files (mp4, webm, ogg, mov, avi, mkv) are allowed."), false);
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed."), false);
};

// All use memoryStorage — buffer stored in req.file.buffer
const uploadVideo = multer({
  storage:    multer.memoryStorage(),
  fileFilter: videoFilter,
  limits:     { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
});

const uploadThumb = multer({
  storage:    multer.memoryStorage(),
  fileFilter: imageFilter,
  limits:     { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const uploadAvatar = multer({
  storage:    multer.memoryStorage(),
  fileFilter: imageFilter,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Raw file upload (ZIP, PDF, DOCX, etc.) — up to 500 MB
const uploadResource = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

module.exports = { uploadVideo, uploadThumb, uploadAvatar, uploadResource };
