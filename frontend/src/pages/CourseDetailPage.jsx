import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { courseAPI, commentAPI, paymentAPI } from "../api";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";
import Loader from "../components/Loader";
import PaymentModal from "../components/PaymentModal";

const fmtDuration = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Static star display ───────────────────────────────────────────────────────
const StarRow = ({ rating, size = 14 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24"
        fill={i <= Math.floor(rating) ? "#F5B731" : "none"}
        stroke="#F5B731" strokeWidth={2}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

// ── Interactive star picker ───────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            className="transition-transform hover:scale-110"
          >
            <svg width={32} height={32} viewBox="0 0 24 24"
              fill={i <= (hover || value) ? "#F5B731" : "none"}
              stroke="#F5B731" strokeWidth={2}
              style={{ filter: i <= (hover || value) ? "drop-shadow(0 0 6px #F5B73180)" : "none" }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm font-semibold text-accent" style={{ color: "#F5B731" }}>
          {labels[hover || value]}
        </p>
      )}
    </div>
  );
};

// ── Preview video area with play-button fallback ──────────────────────────────
// Handles autoPlay being blocked by the browser: shows a big play circle until
// the user explicitly clicks, at which point the video starts.
function VideoArea({ activeLec }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(true);

  // Reset paused state whenever the active lecture changes
  useEffect(() => {
    setPaused(true);
  }, [activeLec?._id]);

  const handlePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setPaused(false)).catch(() => {});
  };

  if (!activeLec?.videoUrl) {
    return (
      <div
        className="flex-shrink-0 bg-black flex flex-col items-center justify-center text-center"
        style={{ minHeight: 220 }}
      >
        <div className="text-5xl mb-3">🎬</div>
        <p className="text-white/40 text-sm">No preview video available</p>
        <p className="text-white/25 text-xs mt-1">
          Mark a lecture as <span className="text-white/40 font-semibold">Free</span> in the Course Builder to enable previews
        </p>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-black relative" style={{ maxHeight: "42vh" }}>
      <video
        ref={videoRef}
        key={activeLec._id}
        src={activeLec.videoUrl}
        controls
        autoPlay
        className="w-full"
        style={{ maxHeight: "42vh", display: "block" }}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onError={() => toast.error("Failed to load preview video.")}
      />

      {/* Big play button overlay — visible until user starts the video */}
      {paused && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={handlePlay}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
            style={{ background: "rgba(232,71,26,0.92)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Udemy-style Course Preview Modal ─────────────────────────────────────────
function CoursePreviewModal({ course, initialLecId, onClose }) {
  // Collect every free lecture that has a video URL, across all sections
  const freeLectures = (course.sections || []).flatMap((sec) =>
    (sec.lectures || [])
      .filter((l) => l.isFree && l.videoUrl)
      .map((l) => ({ ...l, sectionTitle: sec.title }))
  );

  // Pre-select the lecture that was clicked, or fall back to the first free one
  const initial =
    (initialLecId ? freeLectures.find((l) => l._id === initialLecId) : null) ||
    freeLectures[0] ||
    null;

  const [activeLec, setActiveLec] = useState(initial);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-white/[0.1] flex flex-col animate-fade-in"
        style={{ background: "#1c1d1f", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-white/[0.08]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
              Course Preview
            </p>
            <h2 className="font-display font-bold text-white text-base leading-snug line-clamp-2">
              {course.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* ── Video player ── */}
        <VideoArea activeLec={activeLec} />

        {/* ── Free lectures list ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Sticky sub-header */}
          <div
            className="sticky top-0 z-10 flex items-center gap-2 px-6 py-3 border-b border-white/[0.08]"
            style={{ background: "#2d2f31" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#F5B731" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10 8 16 12 10 16 10 8" fill="#F5B731" stroke="none"/>
            </svg>
            <p className="text-sm font-semibold text-white">
              Free Sample Videos
              <span className="text-white/35 font-normal ml-2">
                ({freeLectures.length})
              </span>
            </p>
          </div>

          {freeLectures.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-white/40 text-sm">No free previews for this course.</p>
              <p className="text-white/25 text-xs mt-1">Purchase to unlock all lectures.</p>
            </div>
          ) : (
            freeLectures.map((lec, i) => {
              const isActive = activeLec?._id === lec._id;
              return (
                <button
                  key={lec._id || i}
                  onClick={() => setActiveLec(lec)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all border-b border-white/[0.05] ${
                    isActive
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Thumbnail with play overlay */}
                  <div
                    className="relative flex-shrink-0 rounded-lg overflow-hidden bg-[#2d2f31]"
                    style={{ width: 88, aspectRatio: "16/9" }}
                  >
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ opacity: isActive ? 0.7 : 0.85 }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/20 text-xl">🎬</span>
                      </div>
                    )}
                    {/* Play circle overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                          isActive ? "bg-primary scale-110" : "bg-black/60 group-hover:bg-black/80"
                        }`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug line-clamp-2 ${
                      isActive ? "text-primary" : "text-white/80"
                    }`}>
                      {lec.title}
                    </p>
                    {lec.sectionTitle && (
                      <p className="text-[11px] text-white/35 mt-0.5 truncate">
                        {lec.sectionTitle}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  {lec.duration > 0 && (
                    <span className="text-xs text-white/40 flex-shrink-0 ml-2 font-mono">
                      {fmtDuration(lec.duration)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 px-6 py-3 border-t border-white/[0.08] flex items-center justify-between"
          style={{ background: "#2d2f31" }}
        >
          <p className="text-xs text-white/35">
            🔒 Full access requires enrollment
          </p>
          <button onClick={onClose} className="text-xs text-white/50 hover:text-white underline transition-colors">
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, enrollCourse } = useAuthStore();
  const { addToCart, isInCart } = useCartStore();

  const [activeTab, setActiveTab] = useState("overview");
  const [payModal, setPayModal] = useState({ open: false, orderData: null });
  const [orderLoading, setOrderLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ 0: true });
  const [commentText, setCommentText] = useState("");

  // Course Preview modal state
  const [previewOpen,      setPreviewOpen]      = useState(false);
  const [previewInitialId, setPreviewInitialId] = useState(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // ── Fetch course ───────────────────────────────────────────────────────────
  const {
    data: courseData,
    isLoading,
    isError,
    error,
    refetch: refetchCourse,
  } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => courseAPI.getBySlug(slug).then((r) => r.data.data.course),
    staleTime: 60_000,
    retry: 1,
  });

  // ── Fetch comments ─────────────────────────────────────────────────────────
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["comments", courseData?._id],
    queryFn: () =>
      commentAPI
        .getByCourse(courseData._id, { limit: 20 })
        .then((r) => r.data.data.comments),
    enabled: !!courseData?._id,
    staleTime: 30_000,
  });

  const course = courseData;
  const comments = commentsData || [];

  const isEnrolled = user?.enrolledCourses?.some(
    (id) => (id?._id || id)?.toString() === course?._id?.toString()
  );
  const inCart = course ? isInCart(course._id) : false;
  const discount = course
    ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
    : 0;

  // Has user already left a review?
  const userReview = course?.reviews?.find(
    (r) => r.user?._id?.toString() === user?._id?.toString() || r.user?.toString() === user?._id?.toString()
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleBuyNow = async () => {
    if (!user) { navigate("/login?redirect=/courses/" + slug); return; }
    setOrderLoading(true);
    try {
      const { data } = await paymentAPI.createOrder(course._id);
      setPayModal({ open: true, orderData: data.data });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initiate payment. Try again.");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleVerifyPayment = async (razorpayResp) => {
    const verifyRes = await paymentAPI.verify(razorpayResp);
    if (verifyRes.data.status === "success") {
      enrollCourse(course._id);
      toast.success(`🎉 You're enrolled in ${course.title}!`);
      setTimeout(() => navigate("/profile"), 1200);
    }
  };

  const handleAddToCart = async () => {
    if (!user) { navigate("/login?redirect=/courses/" + slug); return; }
    if (inCart) { navigate("/cart"); return; }
    await addToCart(course);
  };

  const handleComment = async () => {
    if (!user) { toast.error("Sign in to post a comment"); return; }
    if (!commentText.trim()) return;
    try {
      await commentAPI.post(course._id, { text: commentText });
      setCommentText("");
      refetchComments();
      toast.success("Comment posted!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    }
  };

  const handleSubmitReview = async () => {
    if (!user) { toast.error("Sign in to leave a review"); return; }
    if (!reviewRating) { toast.error("Please select a star rating"); return; }
    setReviewLoading(true);
    try {
      await courseAPI.addReview(course._id, { rating: reviewRating, comment: reviewComment.trim() });
      toast.success("Review submitted! 🌟");
      setReviewRating(0);
      setReviewComment("");
      refetchCourse();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewLoading(false);
    }
  };

  // Open the course preview modal; optionally pre-select a specific lecture by ID
  const openPreview = (lecId = null) => {
    setPreviewInitialId(lecId);
    setPreviewOpen(true);
  };

  const toggleSection = (i) =>
    setExpandedSections((p) => ({ ...p, [i]: !p[i] }));

  const TABS = ["overview", "syllabus", "reviews", "comments"];

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (isLoading)
    return (
      <div className="flex justify-center py-32">
        <Loader text="Loading course…" />
      </div>
    );

  if (isError || !course)
    return (
      <div className="text-center py-32">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="font-display font-bold text-2xl mb-2">Course not found</h2>
        <p className="text-white/40 mb-6">
          {error?.response?.data?.message || "This course may have been removed or isn't published yet."}
        </p>
        <Link to="/courses" className="btn-primary inline-flex">
          Browse All Courses →
        </Link>
      </div>
    );

  return (
    <div className="animate-fade-in">
      {/* ── Course Preview Modal ── */}
      {previewOpen && course && (
        <CoursePreviewModal
          course={course}
          initialLecId={previewInitialId}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* ── Payment Modal ── */}
      <PaymentModal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, orderData: null })}
        orderData={payModal.orderData}
        user={user}
        description={course?.title || ""}
        onVerify={handleVerifyPayment}
      />

      {/* ── Breadcrumb ── */}
      <div className="bg-bg-card2 border-b border-white/[0.07] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-white/40">
          <Link to="/" className="hover:text-white/70">Home</Link>
          <span>/</span>
          <Link to="/courses" className="hover:text-white/70">Courses</Link>
          <span>/</span>
          <span className="text-white/70 truncate">{course.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* ── Left (main content) ── */}
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex gap-2 flex-wrap mb-4">
              <span className="badge bg-primary/15 text-primary">{course.category}</span>
              <span className="badge bg-white/[0.07] text-white/60">{course.level}</span>
              {course.isBestseller && (
                <span className="badge bg-accent text-black">Bestseller</span>
              )}
              <span className="badge bg-white/[0.07] text-white/60">
                🌐 {course.language}
              </span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-4xl leading-tight mb-4">
              {course.title}
            </h1>
            <p className="text-white/50 text-base leading-relaxed mb-6">
              {course.description}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 pb-6 border-b border-white/[0.07]">
              {[
                { icon: "⭐", val: `${course.rating} (${(course.totalStudents || 0).toLocaleString("en-IN")} students)` },
                { icon: "📹", val: `${course.totalLectures || 0} lectures` },
                { icon: "⏱", val: fmtDuration(course.totalDuration || 0) },
                { icon: "📊", val: course.level },
                { icon: "👨‍🏫", val: `by ${course.instructorName}` },
              ].map((m) => (
                <span key={m.val} className="text-sm text-white/50 flex items-center gap-1.5">
                  <span>{m.icon}</span>{m.val}
                </span>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`tab-btn capitalize flex-shrink-0 ${activeTab === t ? "active" : ""}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === "reviews"
                    ? `Reviews ${course.totalReviews > 0 ? `(${course.totalReviews})` : ""}`
                    : t}
                </button>
              ))}
            </div>

            {/* ── Overview ── */}
            {activeTab === "overview" && (
              <div className="animate-fade-in">
                {course.whatYouLearn?.length > 0 && (
                  <>
                    <h3 className="font-display font-bold text-lg mb-4">What you'll learn</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                      {course.whatYouLearn.map((item) => (
                        <div key={item} className="flex gap-3 items-start">
                          <span className="text-accent-green mt-0.5 flex-shrink-0">✓</span>
                          <span className="text-sm text-white/60 leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {course.requirements?.length > 0 && (
                  <>
                    <h3 className="font-display font-bold text-lg mb-4">Requirements</h3>
                    <ul className="space-y-2 mb-8">
                      {course.requirements.map((r) => (
                        <li key={r} className="text-sm text-white/60 flex gap-2">
                          <span className="text-white/30 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {course.tags?.length > 0 && (
                  <>
                    <h3 className="font-display font-bold text-lg mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((t) => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Syllabus ── */}
            {activeTab === "syllabus" && (
              <div className="animate-fade-in space-y-3">
                {/* Course stats summary */}
                <div className="flex items-center gap-4 text-sm text-white/40 mb-5 pb-5 border-b border-white/[0.07]">
                  <span>📦 {(course.sections || []).length} sections</span>
                  <span>📹 {course.totalLectures || 0} lectures</span>
                  <span>⏱ {fmtDuration(course.totalDuration || 0)} total length</span>
                  <button
                    className="ml-auto text-primary text-xs hover:text-primary-light font-semibold"
                    onClick={() => {
                      const allOpen = course.sections.every((_, i) => expandedSections[i]);
                      const next = {};
                      course.sections.forEach((_, i) => { next[i] = !allOpen; });
                      setExpandedSections(next);
                    }}
                  >
                    {course.sections?.every((_, i) => expandedSections[i]) ? "Collapse all" : "Expand all"}
                  </button>
                </div>

                {(course.sections || []).length === 0 ? (
                  <p className="text-white/40 text-center py-10">No syllabus added yet.</p>
                ) : (
                  course.sections.map((section, i) => (
                    <div
                      key={i}
                      className="bg-bg-card2 border border-white/[0.07] rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSection(i)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`transition-transform text-xs ${expandedSections[i] ? "rotate-90" : ""}`}>▶</span>
                          <span className="font-semibold text-sm text-left">{section.title}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-white/30">
                            {section.lectures?.length || 0} lessons
                          </span>
                          {section.lectures?.some(l => l.isFree && l.videoUrl) && !isEnrolled && (
                            <span className="text-[10px] text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">
                              Free previews
                            </span>
                          )}
                        </div>
                      </button>
                      {expandedSections[i] && (
                        <div className="border-t border-white/[0.07]">
                          {(section.lectures || []).map((lec, j) => (
                            <div
                              key={lec._id || j}
                              className={`flex items-center gap-3 px-5 py-3.5 ${j < section.lectures.length - 1 ? "border-b border-white/[0.05]" : ""} ${lec.isFree && lec.videoUrl && !isEnrolled ? "hover:bg-white/[0.02] transition-colors" : ""}`}
                            >
                              {/* Icon */}
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isEnrolled || lec.isFree ? "bg-accent-green/15 text-accent-green" : "bg-white/5 text-white/30"}`}
                              >
                                {isEnrolled || lec.isFree ? "▶" : "🔒"}
                              </div>

                              {/* Title */}
                              <span
                                className={`text-sm flex-1 min-w-0 ${isEnrolled || lec.isFree ? "text-white/80" : "text-white/40"}`}
                              >
                                {lec.title}
                              </span>

                              {/* Duration */}
                              {lec.duration > 0 && (
                                <span className="text-xs text-white/30 flex-shrink-0">
                                  {fmtDuration(lec.duration)}
                                </span>
                              )}

                              {/* Preview button — only for free lectures with a video */}
                              {lec.isFree && lec.videoUrl && !isEnrolled && (
                                <button
                                  onClick={() => openPreview(lec._id)}
                                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light border border-primary/30 hover:border-primary/60 px-2.5 py-1 rounded-lg flex-shrink-0 transition-all"
                                >
                                  ▶ Preview
                                </button>
                              )}

                              {/* Free badge (no video or enrolled) */}
                              {lec.isFree && !lec.videoUrl && !isEnrolled && (
                                <span className="badge bg-accent-green/10 text-accent-green text-[10px] flex-shrink-0">
                                  Free
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Reviews ── */}
            {activeTab === "reviews" && (
              <div className="animate-fade-in">
                {/* Rating summary */}
                <div className="flex items-center gap-6 mb-8 p-6 bg-bg-card2 rounded-2xl border border-white/[0.07]">
                  <div className="text-center">
                    <div className="font-display font-black text-5xl mb-1 text-white">
                      {course.rating || 0}
                    </div>
                    <StarRow rating={course.rating || 0} />
                    <p className="text-xs text-white/30 mt-1">
                      {course.totalReviews || 0} rating{course.totalReviews !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* ── Submit Review Form ── */}
                {isEnrolled && !userReview && (
                  <div className="mb-8 p-6 bg-bg-card2 border border-white/[0.07] rounded-2xl">
                    <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
                      <span>⭐</span> Rate this course
                    </h3>

                    <StarPicker value={reviewRating} onChange={setReviewRating} />

                    <div className="mt-4">
                      <label className="text-xs font-medium text-white/40 mb-1.5 block">
                        Your review (optional)
                      </label>
                      <textarea
                        className="input resize-none"
                        rows={3}
                        placeholder="Share what you liked, what could be better…"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        maxLength={500}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-white/25">{reviewComment.length}/500</span>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitReview}
                      disabled={!reviewRating || reviewLoading}
                      className="btn-primary mt-4 text-sm disabled:opacity-40"
                    >
                      {reviewLoading ? "Submitting…" : "Submit Review →"}
                    </button>
                  </div>
                )}

                {/* Already reviewed */}
                {isEnrolled && userReview && (
                  <div className="mb-6 p-4 bg-accent-green/5 border border-accent-green/20 rounded-xl flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-accent-green">You've reviewed this course</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRow rating={userReview.rating} size={11} />
                        {userReview.comment && <span className="text-xs text-white/40">"{userReview.comment}"</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Not enrolled prompt */}
                {!isEnrolled && !user && (
                  <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.07] rounded-xl text-center">
                    <p className="text-sm text-white/40 mb-2">Enroll in this course to leave a review</p>
                    <button onClick={handleBuyNow} className="btn-primary text-sm py-2 px-4 inline-flex">
                      Enroll Now →
                    </button>
                  </div>
                )}

                {/* Review list */}
                <div className="space-y-4">
                  {(course.reviews || []).length === 0 ? (
                    <p className="text-center text-white/40 py-10">
                      No reviews yet. Be the first!
                    </p>
                  ) : (
                    course.reviews.map((r) => (
                      <div
                        key={r._id}
                        className="flex gap-4 p-4 bg-bg-card2 rounded-xl border border-white/[0.07]"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {(r.user?.name || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-sm">{r.user?.name || "Student"}</p>
                            {r.createdAt && (
                              <span className="text-xs text-white/30">
                                {new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <StarRow rating={r.rating} size={11} />
                          {r.comment && (
                            <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{r.comment}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Comments ── */}
            {activeTab === "comments" && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <textarea
                    className="input resize-none mb-3"
                    rows={3}
                    placeholder={
                      user ? "Share your thoughts or ask a question…" : "Sign in to post a comment"
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={!user}
                  />
                  <button
                    className="btn-primary text-sm"
                    onClick={handleComment}
                    disabled={!user || !commentText.trim()}
                  >
                    Post Comment
                  </button>
                </div>
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-white/40 py-8">
                      No comments yet. Start the discussion!
                    </p>
                  ) : (
                    comments.map((c) => (
                      <div key={c._id} className="flex gap-4">
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {(c.user?.name || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="font-semibold text-sm">{c.user?.name}</span>
                            <span className="text-xs text-white/30">
                              {new Date(c.createdAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed">{c.text}</p>
                          <span className="text-xs text-white/30 mt-1 inline-block">
                            👍 {(c.likes || []).length}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky Sidebar ── */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sticky top-20">
              <div className="bg-bg-card border border-white/[0.12] rounded-3xl overflow-hidden shadow-2xl">
                {/* Thumbnail / Preview video */}
                <div className="relative" style={{ aspectRatio: "16/9" }}>
                  {course.thumbnail ? (
                    <>
                      <img
                        src={course.thumbnail}
                        alt=""
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                        onClick={() => openPreview(null)}
                      >
                        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center hover:scale-110 transition-transform shadow-xl group-hover:bg-primary">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                        <div className="absolute bottom-3 left-0 right-0 text-center">
                          <span className="text-xs text-white/80 bg-black/60 px-3 py-1 rounded-full font-medium">
                            ▶ Course Preview
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-bg-card2 flex items-center justify-center">
                      <span className="text-4xl opacity-30">🎓</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Price */}
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-display font-black text-3xl">
                      ₹{course.price.toLocaleString("en-IN")}
                    </span>
                    {course.originalPrice > course.price && (
                      <span className="text-white/30 text-sm line-through">
                        ₹{course.originalPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {discount > 0 && (
                    <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl px-3 py-2 mb-5 text-sm text-accent-green font-medium">
                      🔥 {discount}% off — Limited time offer!
                    </div>
                  )}

                  {/* CTAs */}
                  {isEnrolled ? (
                    <div className="space-y-2 mb-5">
                      <button
                        className="btn-primary w-full justify-center py-4 text-base"
                        style={{ background: "#2ECC71" }}
                        onClick={() => navigate("/learn/" + course._id)}
                      >
                        ▶ Continue Learning
                      </button>
                      <button
                        className="btn-ghost w-full justify-center py-2.5 text-sm"
                        onClick={() => setActiveTab("reviews")}
                      >
                        ⭐ Leave a Review
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-5">
                      <button
                        className="btn-primary w-full justify-center py-4 text-base"
                        onClick={handleBuyNow}
                        disabled={orderLoading}
                      >
                        {orderLoading ? "Preparing…" : "Buy Now →"}
                      </button>
                      <button
                        className="btn-ghost w-full justify-center py-3 text-sm"
                        onClick={handleAddToCart}
                      >
                        {inCart ? "🛒 View Cart" : "🛒 Add to Cart"}
                      </button>
                    </div>
                  )}

                  {/* Course includes */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
                      This course includes
                    </p>
                    {[
                      ["🎓", "Certificate of completion"],
                      ["📱", "Mobile & desktop access"],
                      ["♾️", "Full lifetime access"],
                      ["💬", "Community Q&A support"],
                      ["📥", "Downloadable resources"],
                    ].map(([icon, text]) => (
                      <div
                        key={text}
                        className="flex items-center gap-3 text-sm text-white/50"
                      >
                        <span className="text-base">{icon}</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
