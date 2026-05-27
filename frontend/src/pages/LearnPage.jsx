import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { courseAPI } from "../api";
import useAuthStore from "../store/useAuthStore";
import VideoPlayer from "../components/VideoPlayer";

const fmtSec = (s = 0) => {
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return `${m}:${sec}`;
};

// ── Sidebar lecture item ──────────────────────────────────────────────────────
function LectureItem({ lec, index, active, onClick, completed }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all border-l-2 ${
        active
          ? "bg-primary/10 border-primary"
          : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
        completed ? "bg-accent-green text-black" : active ? "bg-primary text-white" : "bg-white/10 text-white/40"
      }`}>
        {completed ? "✓" : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${active ? "text-white" : "text-white/60"}`}>
          {lec.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lec.videoUrl
            ? <span className="text-[10px] text-white/30">🎬 {lec.duration > 0 ? fmtSec(lec.duration) : "Video"}</span>
            : <span className="text-[10px] text-white/30">📝 Reading</span>
          }
          {lec.isFree && <span className="text-[10px] text-accent-green">Free</span>}
        </div>
      </div>
    </button>
  );
}

// ── Star picker for rating modal ──────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor 😕", "Fair 😐", "Good 👍", "Very good 😊", "Excellent 🤩"];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            className="transition-transform hover:scale-125 active:scale-110"
          >
            <svg width="36" height="36" viewBox="0 0 24 24"
              fill={i <= (hover || value) ? "#F5B731" : "none"}
              stroke="#F5B731" strokeWidth={1.8}
              style={{ filter: i <= (hover || value) ? "drop-shadow(0 0 6px #F5B73199)" : "none", transition: "all 0.15s" }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      <p className="text-sm font-semibold h-5" style={{ color: "#F5B731" }}>
        {labels[hover || value] || ""}
      </p>
    </div>
  );
}

// ── Course completion + rating modal ──────────────────────────────────────────
function RatingModal({ courseTitle, courseId, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { toast.error("Please select a rating first"); return; }
    setLoading(true);
    try {
      await courseAPI.addReview(courseId, { rating, comment: comment.trim() });
      setSubmitted(true);
      toast.success("Review submitted! 🌟");
    } catch (err) {
      // If already reviewed just proceed
      if (err.response?.status === 400) {
        setSubmitted(true);
      } else {
        toast.error(err.response?.data?.message || "Failed to submit review");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
    >
      <div className="w-full max-w-md bg-[#0D1120] border border-white/[0.1] rounded-3xl p-8 text-center animate-fade-in shadow-2xl">

        {submitted ? (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display font-black text-2xl text-white mb-2">
              Course Complete!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Amazing work finishing <span className="text-white font-semibold">{courseTitle}</span>.<br/>
              Your review has been submitted!
            </p>
            <button onClick={onDone} className="btn-primary w-full justify-center py-3.5">
              Go to My Profile →
            </button>
          </>
        ) : (
          <>
            {/* Trophy */}
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="font-display font-black text-2xl text-white mb-1">
              You finished the course!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              How would you rate <span className="text-white font-medium">{courseTitle}</span>?
            </p>

            {/* Stars */}
            <div className="mb-6">
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* Comment */}
            <textarea
              className="input resize-none mb-4 text-sm"
              rows={3}
              placeholder="Share your experience (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!rating || loading}
                className="btn-primary flex-1 justify-center py-3 text-sm disabled:opacity-40"
              >
                {loading ? "Submitting…" : "Submit Review →"}
              </button>
              <button
                onClick={onDone}
                className="px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 text-sm transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Learn Page ───────────────────────────────────────────────────────────
export default function LearnPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuthStore();

  const [activeLec,   setActiveLec]   = useState(null);
  const [completed,   setCompleted]   = useState({});
  // Open by default on desktop, closed on mobile
  const [sideOpen,    setSideOpen]    = useState(() => window.innerWidth >= 1024);
  const [ratingModal, setRatingModal] = useState(false);

  const videoRef = useRef();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => { if (!user) navigate("/login"); }, [user]);

  // ── Fetch lectures ─────────────────────────────────────────────────────────
  const { data: lectureData, isLoading, isError } = useQuery({
    queryKey: ["learn-lectures", id],
    queryFn:  () => courseAPI.getLectures(id).then(r => r.data.data),
    staleTime: 60_000,
    retry: 1,
  });

  // Admin / instructor fallback via builder endpoint
  const { data: builderData, isLoading: builderLoading } = useQuery({
    queryKey: ["learn-builder", id],
    queryFn:  () => courseAPI.getBuilder(id).then(r => r.data.data.course),
    staleTime: 60_000,
    retry: false,
  });

  const sections    = lectureData?.sections || builderData?.sections || [];
  const courseTitle = lectureData?.title    || builderData?.title    || "Course";

  // Flat list for prev/next navigation
  const allLectures = sections.flatMap((sec, si) =>
    (sec.lectures || []).map((lec, li) => ({ sectionIdx: si, lecIdx: li, lec, sectionTitle: sec.title }))
  );

  // Auto-select first lecture
  useEffect(() => {
    if (allLectures.length > 0 && !activeLec) setActiveLec(allLectures[0]);
  }, [sections.length]);

  const activeIndex = activeLec
    ? allLectures.findIndex(l => l.lec._id === activeLec.lec._id)
    : -1;

  const goTo = (item) => {
    setActiveLec(item);
    // VideoPlayer resets itself via key={src}, but pause the current one first
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    // Auto-close sidebar on mobile when a lecture is selected
    if (window.innerWidth < 1024) setSideOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markCompleted = (lecId) => setCompleted(p => ({ ...p, [lecId]: true }));

  const handleVideoEnded = () => {
    if (activeLec) markCompleted(activeLec.lec._id);
    const next = allLectures[activeIndex + 1];
    if (next) {
      toast.success("Lecture complete! Next up: " + next.lec.title, { duration: 2000 });
      setTimeout(() => goTo(next), 2000);
    } else {
      // Last lecture — open rating modal
      setRatingModal(true);
    }
  };

  const handleFinishCourse = () => {
    markCompleted(activeLec.lec._id);
    setRatingModal(true);
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading || (isError && builderLoading)) return (
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/40 text-sm">Loading course content…</p>
      </div>
    </div>
  );

  if ((isError && !builderData) || (!isLoading && !builderLoading && sections.length === 0)) return (
    <div className="min-h-screen bg-[#07090F] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="font-display font-bold text-2xl text-white mb-3">Access Denied</h2>
        <p className="text-white/40 mb-6">You need to be enrolled in this course to watch the lectures.</p>
        <Link to="/courses" className="btn-primary inline-flex">Browse Courses →</Link>
      </div>
    </div>
  );

  const totalLectures  = allLectures.length;
  const completedCount = Object.keys(completed).length;
  const progressPct    = totalLectures ? Math.round((completedCount / totalLectures) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#07090F] flex flex-col text-white" style={{ fontFamily: "DM Sans, sans-serif" }}>

      {/* ── Rating modal ── */}
      {ratingModal && (
        <RatingModal
          courseTitle={courseTitle}
          courseId={id}
          onClose={() => setRatingModal(false)}
          onDone={() => { setRatingModal(false); navigate("/profile"); }}
        />
      )}

      {/* ── Top Bar ── */}
      <header className="bg-[#0D1120] border-b border-white/[0.07] px-4 py-3 flex items-center gap-4 sticky top-0 z-40">
        <Link to="/" className="text-white/40 hover:text-white transition-colors text-xl flex-shrink-0">←</Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{courseTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 max-w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs text-white/30">{completedCount}/{totalLectures} done</span>
          </div>
        </div>
        <button
          onClick={() => setSideOpen(p => !p)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] flex-shrink-0"
        >
          {/* Mobile: hamburger / X icon */}
          <span className="lg:hidden text-base leading-none">{sideOpen ? "✕" : "☰"}</span>
          {/* Desktop: text label */}
          <span className="hidden lg:inline">{sideOpen ? "◀ Hide" : "▶ Show"} Sidebar</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Mobile backdrop — tap to close sidebar ── */}
        {sideOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSideOpen(false)}
          />
        )}

        {/* ── Sidebar ──
              Mobile  : fixed drawer from left, full height, z-50 (above header)
              Desktop : in-flow side panel, collapses to w-0                     */}
        <aside
          className={[
            "transition-all duration-300 overflow-hidden bg-[#0D1120] border-r border-white/[0.07] flex flex-col",
            // Mobile: fixed full-height drawer
            "fixed top-0 left-0 bottom-0 z-50",
            "w-[85vw] max-w-[320px]",
            sideOpen ? "translate-x-0" : "-translate-x-full",
            // Desktop: in-flow panel (overrides fixed)
            "lg:relative lg:top-auto lg:left-auto lg:bottom-auto lg:z-auto lg:translate-x-0",
            sideOpen ? "lg:w-80" : "lg:w-0",
          ].join(" ")}
          style={{ minHeight: 0 }}
        >
          {/* Mobile close button at top of drawer */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0D1120]">
            <p className="text-sm font-semibold text-white/70">Course Content</p>
            <button
              onClick={() => setSideOpen(false)}
              className="text-white/40 hover:text-white text-xl leading-none transition-colors"
            >✕</button>
          </div>

          <div className="overflow-y-auto flex-1">
            {sections.map((sec, si) => (
              <div key={sec._id || si}>
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.05]">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{sec.title}</p>
                  <p className="text-xs text-white/20 mt-0.5">{(sec.lectures || []).length} lectures</p>
                </div>
                {(sec.lectures || []).map((lec, li) => {
                  const item = { sectionIdx: si, lecIdx: li, lec, sectionTitle: sec.title };
                  return (
                    <LectureItem
                      key={lec._id || li}
                      lec={lec}
                      index={li}
                      active={activeLec?.lec._id === lec._id}
                      completed={!!completed[lec._id]}
                      onClick={() => goTo(item)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {activeLec ? (
            <>
              {/* ── Custom Video Player ── */}
              {activeLec.lec.videoUrl ? (
                <VideoPlayer
                  ref={videoRef}
                  src={activeLec.lec.videoUrl}
                  onEnded={handleVideoEnded}
                  onError={() => toast.error("Failed to load video. Check the video URL.")}
                />
              ) : (
                <div className="w-full flex items-center justify-center bg-[#0A0C14]" style={{ minHeight: 360 }}>
                  <div className="text-center">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-white/40 text-base">No video for this lecture</p>
                    <p className="text-white/20 text-sm mt-1">Reading / text-based content</p>
                  </div>
                </div>
              )}

              {/* ── Lecture info ── */}
              <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">{activeLec.sectionTitle}</p>
                    <h1 className="font-display font-bold text-2xl text-white">{activeLec.lec.title}</h1>
                  </div>
                  <button
                    onClick={() => markCompleted(activeLec.lec._id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      completed[activeLec.lec._id]
                        ? "bg-accent-green/15 border-accent-green/30 text-accent-green"
                        : "bg-white/[0.05] border-white/10 text-white/50 hover:bg-white/[0.08]"
                    }`}
                  >
                    {completed[activeLec.lec._id] ? "✓ Completed" : "Mark as done"}
                  </button>
                </div>

                {activeLec.lec.description && (
                  <p className="text-white/50 leading-relaxed mb-6">{activeLec.lec.description}</p>
                )}

                {/* ── Downloadable Resources ── */}
                {activeLec.lec.resources?.length > 0 && (
                  <div className="mb-8 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                    <p className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                      <span>📎</span> Lecture Resources
                    </p>
                    <div className="flex flex-col gap-2">
                      {activeLec.lec.resources.map((r) => (
                        <a key={r._id} href={r.url} target="_blank" rel="noopener noreferrer" download
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] transition-colors group">
                          <span className="text-xl">
                            {["zip","rar","7z"].includes(r.type) ? "🗜️"
                              : r.type === "pdf" ? "📄"
                              : ["doc","docx"].includes(r.type) ? "📝"
                              : ["js","ts","py","html","css","json"].includes(r.type) ? "💻"
                              : "📎"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/80 group-hover:text-white truncate transition-colors">{r.name}</p>
                            {r.size > 0 && (
                              <p className="text-xs text-white/30">
                                {r.type?.toUpperCase()} · {r.size < 1024*1024
                                  ? `${(r.size/1024).toFixed(1)} KB`
                                  : `${(r.size/1024/1024).toFixed(1)} MB`}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">⬇ Download</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prev / Next */}
                <div className="flex items-center justify-between pt-6 border-t border-white/[0.07]">
                  <button
                    disabled={activeIndex <= 0}
                    onClick={() => goTo(allLectures[activeIndex - 1])}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.07] text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    ← Previous
                  </button>

                  <span className="text-xs text-white/20">{activeIndex + 1} / {totalLectures}</span>

                  {activeIndex < totalLectures - 1 ? (
                    <button
                      onClick={() => { markCompleted(activeLec.lec._id); goTo(allLectures[activeIndex + 1]); }}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/80 transition-all"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={handleFinishCourse}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-green text-black text-sm font-semibold hover:opacity-90 transition-all"
                    >
                      🏆 Finish Course
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-96">
              <div className="text-center">
                <div className="text-5xl mb-4">▶</div>
                <p className="text-white/40">Select a lecture from the sidebar to start watching</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
