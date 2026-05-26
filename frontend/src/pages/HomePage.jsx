import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courseAPI } from "../api";
import CourseCard from "../components/CourseCard";
import Loader from "../components/Loader";
import useAuthStore from "../store/useAuthStore";

const CATEGORIES = ["All", "Programming", "Web Development", "AI/ML", "DevOps", "Design"];

const STATS = [
  { value: "1.5L+", label: "Students" },
  { value: "50+",   label: "Courses"  },
  { value: "4.8★",  label: "Avg Rating" },
  { value: "95%",   label: "Placement" },
];

const TESTIMONIALS_ROW1 = [
  { name: "Ankita Sharma",   role: "SDE at Amazon",        rating: 5, text: "CodeLearn helped me crack my FAANG interview. The DSA course is unmatched!", avatar: "AS", color: "#E8471A" },
  { name: "Rohit Mehta",     role: "Freelance Dev",        rating: 5, text: "I went from zero to building full-stack apps in 3 months. Worth every rupee.", avatar: "RM", color: "#3B82F6" },
  { name: "Priya Nair",      role: "ML Engineer",          rating: 5, text: "The ML course covers everything from basics to deployment. Truly industry-grade.", avatar: "PN", color: "#10B981" },
  { name: "Karan Verma",     role: "Backend Developer",    rating: 5, text: "Python + Django course was exactly what I needed for my startup. Highly recommended!", avatar: "KV", color: "#8B5CF6" },
  { name: "Sneha Patel",     role: "Data Analyst",         rating: 5, text: "The data science roadmap is so well structured. Got placed at a top MNC after this!", avatar: "SP", color: "#F59E0B" },
  { name: "Arjun Singh",     role: "DevOps Engineer",      rating: 5, text: "Best DevOps course in India. Covered Docker, Kubernetes, CI/CD — everything!", avatar: "AS", color: "#06B6D4" },
  { name: "Meera Joshi",     role: "Frontend Developer",   rating: 5, text: "React and Next.js courses are so practical. Built 3 projects and got hired!", avatar: "MJ", color: "#EC4899" },
];

const TESTIMONIALS_ROW2 = [
  { name: "Vikram Rao",      role: "SDE-2 at Google",     rating: 5, text: "The system design course alone is worth ₹10,000. Got it for ₹999. Insane value.", avatar: "VR", color: "#E8471A" },
  { name: "Pooja Agarwal",   role: "AI Researcher",        rating: 5, text: "Best investment I made in 2024. The Gen AI course is ahead of every platform.", avatar: "PA", color: "#3B82F6" },
  { name: "Rahul Gupta",     role: "Startup Founder",      rating: 5, text: "Learned full-stack in 45 days and launched my SaaS. CodeLearn is a gem!", avatar: "RG", color: "#10B981" },
  { name: "Divya Menon",     role: "Product Manager",      rating: 5, text: "SQL and analytics course helped me transition from ops to PM. Life-changing.", avatar: "DM", color: "#8B5CF6" },
  { name: "Amit Tiwari",     role: "Cloud Architect",      rating: 5, text: "AWS course content is up-to-date and the assignments are real-world. Love it!", avatar: "AT", color: "#F59E0B" },
  { name: "Riya Sharma",     role: "Mobile Developer",     rating: 5, text: "React Native course is brilliant. Released my first app on Play Store after Week 4!", avatar: "RS", color: "#06B6D4" },
  { name: "Sachin Kumar",    role: "Cybersecurity Analyst", rating: 5, text: "The ethical hacking course is comprehensive and taught by a real industry pro.", avatar: "SK", color: "#EC4899" },
];

// ── Single testimonial card ─────────────────────────────────────────────────
function TestimonialCard({ t }) {
  return (
    <div style={{
      width: 300, flexShrink: 0, margin: "0 8px",
      background: "#111118", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px 22px",
      cursor: "default",
      transition: "border-color 0.2s, transform 0.2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${t.color}40`; e.currentTarget.style.transform = "translateY(-3px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Stars */}
      <div style={{ color: "#F59E0B", fontSize: 13, letterSpacing: 1, marginBottom: 10 }}>
        {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
      </div>
      {/* Quote */}
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 16, minHeight: 60 }}>
        "{t.text}"
      </p>
      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: `${t.color}25`, color: t.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
        }}>
          {t.avatar}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 1 }}>{t.name}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#10B981", fontWeight: 600, background: "rgba(16,185,129,0.1)", padding: "3px 8px", borderRadius: 5 }}>
          ✓ Verified
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card shown while loading ──────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="bg-white/[0.06] rounded-xl" style={{ aspectRatio: "16/9" }} />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
          <div className="h-5 w-12 bg-white/[0.06] rounded-full" />
        </div>
        <div className="h-4 bg-white/[0.06] rounded w-4/5" />
        <div className="h-4 bg-white/[0.06] rounded w-3/5" />
        <div className="h-3 bg-white/[0.06] rounded w-1/3 mt-2" />
        <div className="h-10 bg-white/[0.06] rounded-xl mt-4" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch]     = useState("");
  const { user } = useAuthStore();

  // ── Featured / popular courses (top 3) ─────────────────────────────────
  const { data: featuredData, isLoading: featLoading } = useQuery({
    queryKey: ["home-featured"],
    queryFn: () =>
      courseAPI.getAll({ sort: "popular", limit: 3 }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // ── Browse grid (category + search) ────────────────────────────────────
  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ["home-browse", category, search],
    queryFn: () =>
      courseAPI
        .getAll({
          category: category !== "All" ? category : undefined,
          search:   search   || undefined,
          sort:     "popular",
          limit:    6,
        })
        .then((r) => r.data),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const featuredCourses = featuredData?.data?.courses || [];
  const browseCourses   = browseData?.data?.courses   || [];
  const browseTotal     = browseData?.total            || 0;

  return (
    <div className="animate-fade-in">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(232,71,26,0.14) 0%, transparent 70%)", filter: "blur(40px)" }}
        />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 text-sm text-primary font-semibold">
            🔥 1,50,000+ learners · India's fastest growing platform
          </div>

          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl leading-[1.05] mb-6 tracking-tight">
            Learn to code.{" "}
            <span className="gradient-text block">Build your future.</span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed max-w-xl mx-auto mb-10">
            Industry-led courses in Python, Web Dev, ML, and more — taught by professionals,
            at prices built for India.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/courses" className="btn-primary px-8 py-4 text-base w-full sm:w-auto justify-center">
              Explore Courses →
            </Link>
            <button className="btn-ghost px-8 py-4 text-base w-full sm:w-auto justify-center">
              ▶ Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display font-black text-3xl text-white mb-1">{s.value}</div>
                <div className="text-xs text-white/30 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="border-y border-white/[0.07] py-5 overflow-hidden bg-white/[0.02]">
        <div className="flex gap-12 items-center justify-center flex-wrap px-8">
          {["Google", "Amazon", "Microsoft", "Flipkart", "Swiggy", "Razorpay", "Zerodha", "Meesho"].map((co) => (
            <span key={co} className="text-sm font-semibold text-white/20 tracking-widest uppercase whitespace-nowrap">
              {co}
            </span>
          ))}
        </div>
        <p className="text-center text-xs text-white/20 mt-3">Our students work at</p>
      </div>

      {/* ── Featured Courses ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title mb-1">Featured Courses</h2>
            <p className="text-sm text-white/40">Handpicked by our instructors</p>
          </div>
          <Link to="/courses" className="text-sm text-primary font-semibold hover:text-primary-light transition-colors">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featLoading
            ? [1, 2, 3].map((n) => <SkeletonCard key={n} />)
            : featuredCourses.length > 0
              ? featuredCourses.map((c) => <CourseCard key={c._id} course={c} />)
              : (
                <div className="col-span-3 text-center py-12 text-white/40">
                  No courses yet — add some from the Admin Dashboard.
                </div>
              )
          }
        </div>
      </section>

      {/* ── Browse All Courses ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="section-title mb-1">All Courses</h2>
            <p className="text-sm text-white/40">
              {browseLoading ? "Loading…" : `${browseTotal} courses available`}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <input
              className="input"
              placeholder="Search courses or instructors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`tab-btn ${category === cat ? "active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {browseLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : browseCourses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {browseCourses.map((c) => <CourseCard key={c._id} course={c} />)}
            </div>
            {browseTotal > 6 && (
              <div className="text-center mt-10">
                <Link to={`/courses${category !== "All" ? `?category=${encodeURIComponent(category)}` : ""}`}
                  className="btn-ghost px-8 py-3 inline-flex">
                  Browse all {browseTotal} courses →
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white/40 mb-4">No courses match your search.</p>
            <button onClick={() => { setSearch(""); setCategory("All"); }}
              className="btn-ghost text-sm inline-flex">
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ── Testimonials — infinite scrolling marquee ── */}
      <section className="border-t border-white/[0.07] bg-white/[0.02] py-16 overflow-hidden">
        <style>{`
          @keyframes marquee-left  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
          .marquee-track-left  { display:flex; width:max-content; animation: marquee-left  38s linear infinite; }
          .marquee-track-right { display:flex; width:max-content; animation: marquee-right 42s linear infinite; }
          .marquee-track-left:hover,
          .marquee-track-right:hover { animation-play-state: paused; }
        `}</style>

        <div className="max-w-3xl mx-auto px-4 text-center mb-10">
          <h2 className="section-title mb-2">What our students say</h2>
          <p className="text-sm text-white/40">Real stories from 1,50,000+ learners across India</p>
        </div>

        {/* Row 1 — scrolls left */}
        <div style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
          <div className="marquee-track-left">
            {[...TESTIMONIALS_ROW1, ...TESTIMONIALS_ROW1].map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="mt-4" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
          <div className="marquee-track-right">
            {[...TESTIMONIALS_ROW2, ...TESTIMONIALS_ROW2].map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-4 text-center"
        style={{ background: "linear-gradient(135deg, rgba(232,71,26,0.12) 0%, rgba(245,183,49,0.06) 100%)" }}>
        <h2 className="font-display font-black text-4xl mb-4">Ready to level up your skills?</h2>
        <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
          Join 1,50,000+ learners building India's tech future with CodeLearn.
        </p>
        <Link
          to={user ? "/courses" : "/register"}
          className="btn-primary px-10 py-4 text-base inline-flex"
        >
          {user ? "Browse Courses →" : "Get Started Free →"}
        </Link>
      </section>

    </div>
  );
}
