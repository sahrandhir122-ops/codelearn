const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

// ── Helper: upload a buffer to Cloudinary via stream ─────────────────────
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    // Convert buffer → readable stream and pipe into Cloudinary
    Readable.from(buffer).pipe(uploadStream);
  });
}

// ── Helper: extract public_id from a Cloudinary URL ───────────────────────
function publicIdFromUrl(url) {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const after  = url.split("/upload/")[1];       // "v123/codelearn/thumbnails/abc.jpg"
    const noVer  = after.replace(/^v\d+\//, "");   // "codelearn/thumbnails/abc.jpg"
    return noVer.replace(/\.[^.]+$/, "");           // "codelearn/thumbnails/abc"
  } catch { return null; }
}

// ── POST /api/upload/thumbnail ─────────────────────────────────────────────
exports.uploadThumbnail = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "fail", message: "No image file provided." });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:          "codelearn/thumbnails",
      resource_type:   "image",
      transformation: [
        { width: 1280, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });
    res.json({
      status: "success",
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (err) {
    console.error("Thumbnail upload error:", err);
    res.status(500).json({ status: "fail", message: err.message || "Upload failed." });
  }
};

// ── POST /api/upload/video ─────────────────────────────────────────────────
exports.uploadVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "fail", message: "No video file provided." });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        "codelearn/videos",
      resource_type: "video",
      // Eager: auto-generate poster thumbnail
      eager:       [{ width: 640, crop: "scale", format: "jpg" }],
      eager_async: true,
    });
    res.json({
      status: "success",
      data: {
        url:          result.secure_url,
        publicId:     result.public_id,
        size:         req.file.size,
        originalName: req.file.originalname,
      },
    });
  } catch (err) {
    console.error("Video upload error:", err);
    res.status(500).json({ status: "fail", message: err.message || "Upload failed." });
  }
};

// ── POST /api/upload/avatar ────────────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "fail", message: "No image file provided." });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        "codelearn/avatars",
      resource_type: "image",
      public_id:     `user_${req.user?._id || Date.now()}`,
      overwrite:     true,
      transformation: [
        { width: 256, height: 256, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });
    res.json({
      status: "success",
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ status: "fail", message: err.message || "Upload failed." });
  }
};

// ── DELETE /api/upload/video ───────────────────────────────────────────────
exports.deleteVideo = async (req, res) => {
  const { url, publicId } = req.body || {};
  const id = publicId || publicIdFromUrl(url);
  if (!id) return res.status(400).json({ status: "fail", message: "Provide publicId or url." });
  try {
    await cloudinary.uploader.destroy(id, { resource_type: "video" });
    res.json({ status: "success", message: "Video deleted." });
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
};

// ── DELETE /api/upload/image ───────────────────────────────────────────────
exports.deleteImage = async (req, res) => {
  const { url, publicId } = req.body || {};
  const id = publicId || publicIdFromUrl(url);
  if (!id) return res.status(400).json({ status: "fail", message: "Provide publicId or url." });
  try {
    await cloudinary.uploader.destroy(id, { resource_type: "image" });
    res.json({ status: "success", message: "Image deleted." });
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
};
