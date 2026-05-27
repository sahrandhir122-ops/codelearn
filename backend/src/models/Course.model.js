const mongoose = require("mongoose");
const slugify = require("slugify");

const resourceSchema = new mongoose.Schema({
  name:    { type: String, required: true },  // display name e.g. "Starter Code.zip"
  url:     { type: String, required: true },  // Cloudinary raw URL
  type:    { type: String, default: "file" }, // "zip" | "pdf" | "file" etc.
  size:    Number,                            // bytes (optional)
});

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  videoUrl: String,        // full URL to the uploaded video file
  duration: Number,        // seconds
  isFree: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  resources: [resourceSchema],  // downloadable attachments (ZIP, PDF, etc.)
});

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  lectures: [lectureSchema],
});

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxlength: 100,
    },
    slug: { type: String, unique: true },
    description: { type: String, required: true, maxlength: 2000 },
    shortDescription: { type: String, maxlength: 200 },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instructorName: String,   // denormalized for quick reads
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true },
    thumbnail: String,
    previewVideoUrl: String,  // publicly accessible preview
    category: {
      type: String,
      required: true,
      enum: ["Programming", "Web Development", "AI/ML", "DevOps", "Design", "Data Science", "Mobile", "Other"],
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    language: {
      type: String,
      enum: ["English", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Gujarati", "Kannada", "Bilingual (Hindi+English)"],
      default: "English",
    },
    tags: [String],
    whatYouLearn: [String],
    requirements: [String],
    sections: [sectionSchema],
    reviews: [reviewSchema],
    totalStudents: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Auto-generate slug ─────────────────────────────────────────────────────
courseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// ── Virtual: total lectures ────────────────────────────────────────────────
courseSchema.virtual("totalLectures").get(function () {
  if (!this.sections) return 0;
  return this.sections.reduce((sum, s) => sum + s.lectures.length, 0);
});

// ── Virtual: total duration (seconds) ─────────────────────────────────────
courseSchema.virtual("totalDuration").get(function () {
  if (!this.sections) return 0;
  return this.sections.reduce(
    (sum, s) => sum + s.lectures.reduce((ls, l) => ls + (l.duration || 0), 0),
    0
  );
});

// ── Recalculate average rating ─────────────────────────────────────────────
courseSchema.methods.calcAverageRating = function () {
  if (!this.reviews.length) { this.rating = 0; this.totalReviews = 0; return; }
  const avg = this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length;
  this.rating = Math.round(avg * 10) / 10;
  this.totalReviews = this.reviews.length;
};

// ── Text index for search ──────────────────────────────────────────────────
courseSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Course", courseSchema);
